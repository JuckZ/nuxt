import { generateChatText } from '#server/ai/gateway'
import type { AiProfile } from '#server/ai/types'

const legacyProfiles: Readonly<Record<string, AiProfile>> = {
  'openai': 'chat-quality',
  'chatgpt': 'chat-quality',
  'spark': 'chat-fast',
  'ernie-bot': 'chat-quality',
}

export default defineEventHandler(async (event) => {
  const providerName = getRouterParam(event, 'slug')?.split('/')[0]?.toLowerCase()
  const query = getQuery(event)
  const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : ''

  if (!providerName) {
    throw createError({ statusCode: 404, statusMessage: 'AI provider was not specified' })
  }

  if (providerName === 'bing' || providerName === 'genimagewithchatgpt') {
    throw createError({
      statusCode: 410,
      statusMessage: providerName === 'bing'
        ? 'The unofficial Bing Chat connector has been retired'
        : 'Image generation is not available through the unified chat endpoint',
    })
  }

  const profile = legacyProfiles[providerName]

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: `Unknown AI provider: ${providerName}` })
  }

  if (!keyword) {
    throw createError({ statusCode: 400, statusMessage: 'The keyword query parameter is required' })
  }

  setResponseHeaders(event, {
    deprecation: 'true',
    link: '</api/ai/chat>; rel="successor-version"',
  })

  const result = await generateChatText({
    profile,
    prompt: keyword,
    messages: undefined,
    tools: [],
  })

  return { data: result.text }
})
