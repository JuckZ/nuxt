import { describe, expect, test } from 'vitest'
import {
  AI_PROFILES,
  aiChatRequestSchema,
} from '../../server/ai/types'

describe('AI chat request contract', () => {
  test('exposes only stable application profiles', () => {
    expect(AI_PROFILES).toEqual(['chat-fast', 'chat-quality', 'reasoning'])
  })

  test('applies safe defaults to a prompt request', () => {
    expect(aiChatRequestSchema.parse({ prompt: 'Hello' })).toEqual({
      profile: 'chat-fast',
      prompt: 'Hello',
      stream: true,
      responseFormat: 'text',
      tools: [],
    })
  })

  test('accepts a typed message conversation', () => {
    const result = aiChatRequestSchema.safeParse({
      profile: 'reasoning',
      messages: [
        { role: 'system', content: 'Be concise.' },
        { role: 'user', content: 'Explain Nuxt.' },
      ],
      stream: false,
      tools: ['current-time'],
    })

    expect(result.success).toBe(true)
  })

  test.each([
    {},
    { prompt: 'Hello', messages: [{ role: 'user', content: 'Hello' }] },
    { profile: 'vendor-specific-model', prompt: 'Hello' },
    { prompt: 'Hello', responseFormat: 'structured', stream: true },
  ])('rejects invalid arguments: %j', (request) => {
    expect(aiChatRequestSchema.safeParse(request).success).toBe(false)
  })
})
