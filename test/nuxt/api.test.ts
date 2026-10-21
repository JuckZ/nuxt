import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $fetch, fetch, setup, startServer } from '@nuxt/test-utils/e2e'
import * as yaml from 'js-yaml'
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { ClashDocument } from '../../server/clash/config'

interface GatewayRequest {
  model?: string
  messages?: unknown[]
  response_format?: unknown
  stream?: boolean
  tools?: Array<{ function?: { name?: string } }>
}

const gatewayRequests: GatewayRequest[] = []
const fixtureCredentials = {
  upstreamPublic: randomUUID(),
  upstreamPrivate: randomUUID(),
  standalonePublic: randomUUID(),
  standalonePrivate: randomUUID(),
}

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
  if (request.method === 'GET' && request.url?.startsWith('/clash/')) {
    if (request.url.startsWith('/clash/fail')) {
      response.writeHead(503).end('Upstream unavailable')
      return
    }

    if (request.url.startsWith('/clash/malformed')) {
      response.writeHead(200).end('password: [secret-upstream-token')
      return
    }

    if (request.url === '/clash/slow') {
      setTimeout(() => response.writeHead(200).end('proxies: []'), 250)
      return
    }

    const isPrivate = request.url === '/clash/private'
    const source = request.url === '/clash/b' ? 'b' : 'a'
    const proxy = {
      name: isPrivate ? '私有节点' : '美国 01',
      type: 'ss',
      server: `${source}.example.com`,
      port: 443,
      cipher: 'aes-128-gcm',
      password: isPrivate ? fixtureCredentials.upstreamPrivate : fixtureCredentials.upstreamPublic,
    }
    response.writeHead(200, {
      'content-type': 'text/yaml',
      'subscription-userinfo': 'upload=1; download=2; total=100; expire=2000000000',
    })
    response.end(yaml.dump({
      'proxies': [proxy, ...(request.url === '/clash/a'
        ? [{ ...proxy, name: '日本 01', 'dialer-proxy': '美国 01' }]
        : [])],
      'proxy-groups': [{ name: '上游选择', type: 'select', proxies: [proxy.name] }],
    }))
    return
  }

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
const clashTemporaryDirectory = await mkdtemp(join(tmpdir(), 'nuxt-clash-test-'))
const clashSourcesFile = join(clashTemporaryDirectory, 'clash.config.yaml')
const clashSourceUrl = (path: string) => `http://127.0.0.1:${mockGatewayAddress.port}/clash/${path}`
const manualNode = {
  name: '独立节点',
  type: 'trojan',
  server: 'manual.example.com',
  port: 443,
  password: fixtureCredentials.standalonePublic,
}

const clashFixture = () => ({
  default: {
    subscriptions: [
      { name: 'A', url: clashSourceUrl('a') },
      { name: 'B', url: clashSourceUrl('b') },
    ],
    proxies: [manualNode],
  },
  private: {
    subscriptions: [{ name: '私有源', url: clashSourceUrl('private') }],
    proxies: [{ ...manualNode, name: '私有自建', password: fixtureCredentials.standalonePrivate }],
  },
})

async function writeClashFixture(config: unknown = clashFixture()) {
  await writeFile(clashSourcesFile, yaml.dump(config), 'utf8')
}

await writeClashFixture()

const testRuntimeConfig = {
  aiGatewayBaseUrl: `http://127.0.0.1:${mockGatewayAddress.port}/v1`,
  aiGatewayApiKey: 'test-gateway-key',
  aiModelChatFast: 'test-fast-group',
  aiModelChatQuality: 'test-quality-group',
  aiModelReasoning: 'test-reasoning-group',
  clashSourcesFile,
  clashSourcesYaml: '',
  clashSubKey: 'test-private-key',
  freeClashSubUrl: clashSourceUrl('a'),
  clashSubUrl: clashSourceUrl('private'),
}

describe('server API', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    browser: false,
    // Nuxt loads the local .env while building. Explicit server overrides keep
    // real credentials and subscription URLs out of the test requests.
    env: Object.fromEntries(Object.entries(testRuntimeConfig).map(([key, value]) => [
      `NUXT_${key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}`,
      value,
    ])),
    nuxtConfig: {
      runtimeConfig: testRuntimeConfig,
    },
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      mockGateway.close(error => error ? reject(error) : resolve())
    })
    await rm(clashTemporaryDirectory, { recursive: true, force: true })
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

  describe('Clash aggregated subscription', () => {
    beforeEach(async () => {
      await writeClashFixture()
    })

    test('merges multiple subscriptions and standalone nodes into a usable YAML export', async () => {
      const response = await fetch('/api/clash')
      const text = await response.text()
      const config = yaml.load(text) as ClashDocument

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/yaml')
      expect(response.headers.get('cache-control')).toContain('no-store')
      expect(response.headers.get('x-clash-source-count')).toBe('2')
      expect(response.headers.get('x-clash-failed-source-count')).toBe('0')
      expect(response.headers.get('subscription-userinfo')).toBeNull()
      expect(config.proxies?.map(proxy => proxy.name)).toEqual([
        '独立节点', '[A] 美国 01', '[A] 日本 01', '[B] 美国 01',
      ])
      expect(config.proxies?.find(proxy => proxy.name === '[A] 日本 01')?.['dialer-proxy']).toBe('[A] 美国 01')
      expect(config['proxy-groups']?.map(group => group.name)).toEqual([
        '🔰 AllProxy', '🤖 USProxy', '📦 A', '📦 B', '🛠 独立节点',
      ])
      expect(config.rules).toContain('MATCH,🔰 AllProxy')
      expect(text).not.toContain(fixtureCredentials.upstreamPrivate)
      expect(text).not.toContain(clashSourceUrl('a'))
      const shortResponse = await fetch('/api/c')
      expect(shortResponse.status).toBe(200)
      expect(shortResponse.redirected).toBe(false)
      expect(await shortResponse.text()).toBe(text)
    })

    test.each([
      '/api/c?k=',
      '/api/c?keyword=',
      '/api/clash?k=',
      '/api/clash?keyword=',
    ])('keeps private nodes isolated behind the configured key at %s', async (path) => {
      const response = await fetch(`${path}test-private-key`)
      const config = yaml.load(await response.text()) as ClashDocument

      expect(response.status).toBe(200)
      expect(config.proxies?.map(proxy => proxy.name)).toEqual(['私有自建', '[私有源] 私有节点'])
      const invalidKey = await fetch(`${path}wrong-key`)
      const text = await invalidKey.text()
      expect(invalidKey.status).toBe(200)
      expect(text).not.toContain(fixtureCredentials.upstreamPrivate)
      expect(text).not.toContain(fixtureCredentials.standalonePrivate)
    })

    test('uses k when both key parameters are supplied', async () => {
      const response = await fetch('/api/c?k=wrong-key&keyword=test-private-key')
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(text).not.toContain(fixtureCredentials.upstreamPrivate)
      const privateResponse = await fetch('/api/c?k=test-private-key&keyword=wrong-key')
      const config = yaml.load(await privateResponse.text()) as ClashDocument
      expect(config.proxies?.map(proxy => proxy.name)).toEqual(['私有自建', '[私有源] 私有节点'])
    })

    test('rejects ambiguous repeated keys', async () => {
      const response = await fetch('/api/c?k=wrong-key&k=test-private-key')
      expect(response.status).toBe(400)
    })

    test('continues with healthy sources when another source fails', async () => {
      const fixture = clashFixture()
      fixture.default.subscriptions[1]!.url = clashSourceUrl('fail?token=secret-upstream-token')
      await writeClashFixture(fixture)

      const response = await fetch('/api/clash')
      const text = await response.text()
      const config = yaml.load(text) as ClashDocument

      expect(response.status).toBe(200)
      expect(response.headers.get('x-clash-failed-source-count')).toBe('1')
      expect(config.proxies).toHaveLength(3)
      expect(text).not.toContain('secret-upstream-token')
    })

    test('supports standalone nodes without any upstream subscription', async () => {
      await writeClashFixture({ default: { proxies: [manualNode] } })
      const response = await fetch('/api/clash')
      const config = yaml.load(await response.text()) as ClashDocument

      expect(response.status).toBe(200)
      expect(response.headers.get('x-clash-source-count')).toBe('0')
      expect(config.proxies).toEqual([manualNode])
      expect(config['proxy-groups']?.find(group => group.name === '🤖 USProxy')?.proxies).toEqual(['🔰 AllProxy'])
    })

    test('returns a sanitized error when every source fails', async () => {
      await writeClashFixture({
        default: {
          subscriptions: [{ name: 'broken', url: clashSourceUrl('malformed?token=secret-upstream-token') }],
        },
      })
      const response = await fetch('/api/clash')
      const text = await response.text()

      expect(response.status).toBe(502)
      expect(text).not.toContain('secret-upstream-token')
      expect(text).not.toContain(clashSourceUrl('malformed'))
    })

    test('bounds slow requests and retains standalone nodes', async () => {
      await writeClashFixture({
        default: {
          subscriptions: [{ name: 'slow', url: clashSourceUrl('slow'), timeoutMs: 100 }],
          proxies: [manualNode],
        },
      })
      const response = await fetch('/api/clash')
      expect(response.status).toBe(200)
      expect(response.headers.get('x-clash-failed-source-count')).toBe('1')
      const config = yaml.load(await response.text()) as ClashDocument
      expect(config.proxies).toEqual([manualNode])
    })

    test('retains legacy environment subscription routing when no profile sources are set', async () => {
      await writeClashFixture({ default: {}, private: {} })
      const response = await fetch('/api/clash')
      const config = yaml.load(await response.text()) as ClashDocument

      expect(response.status).toBe(200)
      expect(response.headers.get('subscription-userinfo')).toContain('total=100')
      expect(config.proxies?.map(proxy => proxy.name)).toEqual(['美国 01', '日本 01'])
      expect(config['proxy-groups']?.map(group => group.name)).toContain('上游选择')
      const privateResponse = await fetch('/api/clash?keyword=test-private-key')
      const privateConfig = yaml.load(await privateResponse.text()) as ClashDocument
      expect(privateConfig.proxies?.[0]?.name).toBe('私有节点')
    })

    test('rejects malformed local configuration without leaking node credentials', async () => {
      await writeFile(clashSourcesFile, 'password: [local-secret-token', 'utf8')
      const response = await fetch('/api/clash')
      const text = await response.text()

      expect(response.status).toBe(500)
      expect(text).not.toContain('local-secret-token')
    })
  })

  describe('Clash inline YAML environment configuration', () => {
    beforeEach(async () => {
      await writeClashFixture()
    })

    afterEach(async () => {
      await writeClashFixture()
      await startServer()
    })

    test('loads complete multiline YAML at runtime without a local file', async () => {
      const inline = clashFixture()
      inline.default.subscriptions[0]!.name = 'ENV-A'
      inline.default.subscriptions[1]!.name = 'ENV-B'
      inline.default.proxies[0] = { ...manualNode, name: '环境变量节点' }
      inline.private.proxies[0]!.name = '环境变量私有节点'

      await startServer({
        env: {
          NUXT_CLASH_SOURCES_YAML: yaml.dump(inline),
          NUXT_CLASH_SOURCES_FILE: join(clashTemporaryDirectory, 'not-present.yaml'),
        },
      })

      const response = await fetch('/api/c')
      const text = await response.text()
      const config = yaml.load(text) as ClashDocument
      expect(response.status).toBe(200)
      expect(config.proxies?.map(proxy => proxy.name)).toEqual([
        '环境变量节点', '[ENV-A] 美国 01', '[ENV-A] 日本 01', '[ENV-B] 美国 01',
      ])
      expect(text).not.toContain(fixtureCredentials.standalonePrivate)
      expect(text).not.toContain(fixtureCredentials.upstreamPrivate)

      const privateResponse = await fetch('/api/c?k=test-private-key')
      const privateConfig = yaml.load(await privateResponse.text()) as ClashDocument
      expect(privateResponse.status).toBe(200)
      expect(privateConfig.proxies?.map(proxy => proxy.name)).toEqual(['环境变量私有节点', '[私有源] 私有节点'])

      const html = await $fetch<string>('/')
      expect(html).not.toContain(fixtureCredentials.standalonePrivate)
      expect(html).not.toContain(fixtureCredentials.upstreamPrivate)
      expect(html).not.toContain('环境变量私有节点')
      expect(html).not.toContain('clashSourcesYaml')
    })

    test('prioritizes inline YAML over a malformed local file', async () => {
      await writeFile(clashSourcesFile, 'private: [invalid-local-yaml', 'utf8')
      await startServer({
        env: { NUXT_CLASH_SOURCES_YAML: yaml.dump({ default: { proxies: [manualNode] } }) },
      })

      const response = await fetch('/api/c')
      const config = yaml.load(await response.text()) as ClashDocument
      expect(response.status).toBe(200)
      expect(config.proxies).toEqual([manualNode])
    })

    test.each(['syntax', 'schema'])('rejects invalid inline YAML (%s) without leaking values or falling back', async (kind) => {
      const marker = randomUUID()
      const source = kind === 'syntax'
        ? `private:\n  proxies: [${marker}`
        : yaml.dump({ private: { subscriptions: [{ name: 'invalid', url: `file:///${marker}` }] } })

      await startServer({ env: { NUXT_CLASH_SOURCES_YAML: source } })

      const response = await fetch('/api/c')
      const text = await response.text()
      expect(response.status).toBe(500)
      expect(text).not.toContain(marker)
      expect(text).not.toContain(fixtureCredentials.standalonePublic)
    })

    test('keeps file configuration enabled when inline YAML is whitespace-only', async () => {
      await startServer({ env: { NUXT_CLASH_SOURCES_YAML: ' \n\t ' } })
      const response = await fetch('/api/c')
      const config = yaml.load(await response.text()) as ClashDocument

      expect(response.status).toBe(200)
      expect(config.proxies?.map(proxy => proxy.name)).toEqual([
        '独立节点', '[A] 美国 01', '[A] 日本 01', '[B] 美国 01',
      ])
    })
  })
})
