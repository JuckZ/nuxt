import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, test } from 'vitest'

interface GatewayRequest {
  model?: string
  messages?: unknown[]
  response_format?: unknown
  stream?: boolean
  tools?: Array<{ function?: { name?: string } }>
}

const gatewayRequests: GatewayRequest[] = []

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as GatewayRequest
}

function sendJson(response: ServerResponse, value: unknown) {
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify(value))
}

const mockGateway = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
    response.writeHead(404).end()
    return
  }

  const body = await readJsonBody(request)
  gatewayRequests.push(body)

  if (body.stream) {
    response.writeHead(200, {
      'cache-control': 'no-cache',
      'content-type': 'text/event-stream',
    })
    response.write('data: {"id":"chatcmpl-stream","object":"chat.completion.chunk","created":1,"model":"mock","choices":[{"index":0,"delta":{"role":"assistant","content":"streamed "},"finish_reason":null}]}\n\n')
    response.write('data: {"id":"chatcmpl-stream","object":"chat.completion.chunk","created":1,"model":"mock","choices":[{"index":0,"delta":{"content":"answer"},"finish_reason":null}]}\n\n')
    response.write('data: {"id":"chatcmpl-stream","object":"chat.completion.chunk","created":1,"model":"mock","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":2,"total_tokens":4}}\n\n')
    response.end('data: [DONE]\n\n')
    return
  }

  const content = body.response_format
    ? JSON.stringify({
        answer: 'Structured answer',
        summary: 'Summary',
        followUps: ['Next question?'],
      })
    : 'Non-streamed answer'

  sendJson(response, {
    id: 'chatcmpl-json',
    object: 'chat.completion',
    created: 1,
    model: 'mock',
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 2,
      completion_tokens: 3,
      total_tokens: 5,
    },
  })
})

await new Promise<void>((resolve) => {
  mockGateway.listen(0, '127.0.0.1', resolve)
})

const mockGatewayAddress = mockGateway.address() as AddressInfo

describe('server API', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    browser: false,
    nuxtConfig: {
      runtimeConfig: {
        aiGatewayBaseUrl: `http://127.0.0.1:${mockGatewayAddress.port}/v1`,
        aiGatewayApiKey: 'test-gateway-key',
        aiModelChatFast: 'test-fast-group',
        aiModelChatQuality: 'test-quality-group',
        aiModelReasoning: 'test-reasoning-group',
      },
    },
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      mockGateway.close(error => error ? reject(error) : resolve())
    })
  })

  test('renders the Nuxt 4 app directory', async () => {
    const html = await $fetch<string>('/')

    expect(html).toContain('Welcome to the homepage')
  })

  test('increments the in-memory counter', async () => {
    const first = await $fetch<number>('/api/count')
    const second = await $fetch<number>('/api/count')

    expect(second).toBe(first + 1)
  })

  test('runs the WebAssembly sum function', async () => {
    const result = await $fetch<{ sum: number }>('/api/sum', {
      query: { a: 2, b: 3 },
    })

    expect(result).toEqual({ sum: 5 })
  })

  test('runs the Go WebAssembly module', async () => {
    const result = await $fetch<{ greeting: string, requestCount: number }>('/api/ntfy', {
      query: { name: 'Nuxt' },
    })

    expect(result.greeting).toBe('Hello, Nuxt!')
    expect(result.requestCount).toBeGreaterThan(0)
  })

  test('generates a non-streaming response through the selected model group', async () => {
    const result = await $fetch<{
      profile: string
      text: string
      finishReason: string
      usage: { totalTokens?: number }
    }>('/api/ai/chat', {
      method: 'POST',
      body: {
        profile: 'chat-quality',
        prompt: 'Hello',
        stream: false,
        tools: ['current-time'],
      },
    })

    expect(result).toMatchObject({
      profile: 'chat-quality',
      text: 'Non-streamed answer',
      finishReason: 'stop',
    })
    expect(gatewayRequests.at(-1)).toMatchObject({
      model: 'test-quality-group',
    })
    expect(gatewayRequests.at(-1)?.stream).toBeUndefined()
    expect(gatewayRequests.at(-1)?.tools?.[0]?.function?.name).toBe('currentTime')
  })

  test('streams plain text without application-managed SSE framing', async () => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        profile: 'chat-fast',
        prompt: 'Hello',
        stream: true,
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/plain')
    expect(response.headers.get('x-ai-profile')).toBe('chat-fast')
    expect(await response.text()).toBe('streamed answer')
    expect(gatewayRequests.at(-1)?.model).toBe('test-fast-group')
  })

  test('keeps the legacy chat route as a deprecated profile adapter', async () => {
    const response = await fetch('/api/aichat/OpenAI?keyword=Hello')

    expect(response.status).toBe(200)
    expect(response.headers.get('deprecation')).toBe('true')
    expect(response.headers.get('link')).toContain('/api/ai/chat')
    expect(await response.json()).toEqual({ data: 'Non-streamed answer' })
    expect(gatewayRequests.at(-1)?.model).toBe('test-quality-group')
  })

  test('returns a schema-validated structured response', async () => {
    const result = await $fetch<{
      profile: string
      output: { answer: string, summary: string, followUps: string[] }
    }>('/api/ai/chat', {
      method: 'POST',
      body: {
        profile: 'reasoning',
        messages: [{ role: 'user', content: 'Give me a structured answer.' }],
        responseFormat: 'structured',
        stream: false,
      },
    })

    expect(result).toEqual(expect.objectContaining({
      profile: 'reasoning',
      output: {
        answer: 'Structured answer',
        summary: 'Summary',
        followUps: ['Next question?'],
      },
    }))
    expect(gatewayRequests.at(-1)).toEqual(expect.objectContaining({
      model: 'test-reasoning-group',
      response_format: expect.any(Object),
    }))
  })

  test('rejects unknown profiles before calling the gateway', async () => {
    const before = gatewayRequests.length
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile: 'provider-model', prompt: 'Hello' }),
    })

    expect(response.status).toBe(400)
    expect(gatewayRequests).toHaveLength(before)
  })
})
