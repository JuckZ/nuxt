import { createTextStreamResponse, toTextStream } from 'ai'
import {
  generateChatText,
  generateStructuredChat,
  streamChatText,
} from '#server/ai/gateway'
import { aiChatRequestSchema } from '#server/ai/types'

export default defineEventHandler(async (event) => {
  const parsed = aiChatRequestSchema.safeParse(await readBody<unknown>(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid AI chat request',
      data: parsed.error.flatten(),
    })
  }

  const request = parsed.data

  if (request.stream) {
    const result = streamChatText(request)

    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
      headers: {
        'cache-control': 'no-cache, no-transform',
        'x-ai-profile': request.profile,
      },
    })
  }

  if (request.responseFormat === 'structured') {
    const result = await generateStructuredChat(request)

    return {
      profile: request.profile,
      output: result.output,
      finishReason: result.finishReason,
      usage: result.usage,
    }
  }

  const result = await generateChatText(request)

  return {
    profile: request.profile,
    text: result.text,
    finishReason: result.finishReason,
    usage: result.usage,
  }
})
