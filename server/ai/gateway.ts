import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import {
  generateText,
  isStepCount,
  Output,
  streamText,
  tool,
  type ModelMessage,
} from 'ai'
import { z } from 'zod'
import {
  structuredChatOutputSchema,
  type AiChatMessage,
  type AiChatRequest,
  type AiProfile,
} from '#server/ai/types'

interface AiGatewayRuntimeConfig {
  aiGatewayBaseUrl: string
  aiGatewayApiKey: string
  aiModelChatFast: string
  aiModelChatQuality: string
  aiModelReasoning: string
}

type ChatInput = Pick<AiChatRequest, 'messages' | 'profile' | 'prompt' | 'tools'>

const currentTimeTool = tool({
  description: 'Get the current date and time in an IANA time zone.',
  inputSchema: z.object({
    timeZone: z.string().default('UTC').describe('An IANA time zone such as UTC or Asia/Shanghai'),
  }),
  execute: async ({ timeZone }) => {
    try {
      return {
        iso: new Date().toISOString(),
        localized: new Intl.DateTimeFormat('en-CA', {
          dateStyle: 'full',
          timeStyle: 'long',
          timeZone,
        }).format(new Date()),
        timeZone,
      }
    }
    catch {
      throw new Error(`Invalid IANA time zone: ${timeZone}`)
    }
  },
})

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function readGatewayConfig(): AiGatewayRuntimeConfig {
  const config = useRuntimeConfig()
  const gatewayConfig = {
    aiGatewayBaseUrl: normalizeBaseUrl(config.aiGatewayBaseUrl),
    aiGatewayApiKey: config.aiGatewayApiKey.trim(),
    aiModelChatFast: config.aiModelChatFast.trim(),
    aiModelChatQuality: config.aiModelChatQuality.trim(),
    aiModelReasoning: config.aiModelReasoning.trim(),
  }

  if (!gatewayConfig.aiGatewayBaseUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'The AI gateway URL is not configured',
    })
  }

  if (!gatewayConfig.aiModelChatFast || !gatewayConfig.aiModelChatQuality || !gatewayConfig.aiModelReasoning) {
    throw createError({
      statusCode: 503,
      statusMessage: 'One or more AI model profiles are not configured',
    })
  }

  return gatewayConfig
}

export function getAiModelGroups(config: AiGatewayRuntimeConfig = readGatewayConfig()): Readonly<Record<AiProfile, string>> {
  return {
    'chat-fast': config.aiModelChatFast,
    'chat-quality': config.aiModelChatQuality,
    'reasoning': config.aiModelReasoning,
  }
}

function getLanguageModel(profile: AiProfile) {
  const config = readGatewayConfig()
  const provider = createOpenAICompatible<string, string, string, string>({
    name: 'litellm',
    baseURL: config.aiGatewayBaseUrl,
    includeUsage: true,
    supportsStructuredOutputs: true,
    ...(config.aiGatewayApiKey ? { apiKey: config.aiGatewayApiKey } : {}),
  })

  return provider.chatModel(getAiModelGroups(config)[profile])
}

function getPromptOptions(input: ChatInput):
  | { prompt: string, messages?: never }
  | { messages: ModelMessage[], prompt?: never, allowSystemInMessages: true } {
  if (input.prompt !== undefined) {
    return { prompt: input.prompt }
  }

  return {
    messages: input.messages as AiChatMessage[] as ModelMessage[],
    allowSystemInMessages: true,
  }
}

function getToolOptions(input: ChatInput) {
  return input.tools.includes('current-time')
    ? {
        tools: { currentTime: currentTimeTool },
        stopWhen: isStepCount(5),
      }
    : {}
}

export async function generateChatText(input: ChatInput) {
  return generateText({
    model: getLanguageModel(input.profile),
    ...getPromptOptions(input),
    ...getToolOptions(input),
  })
}

export async function generateStructuredChat(input: ChatInput) {
  return generateText({
    model: getLanguageModel(input.profile),
    ...getPromptOptions(input),
    ...getToolOptions(input),
    output: Output.object({
      schema: structuredChatOutputSchema,
      name: 'assistant_answer',
      description: 'A structured answer with a summary and optional follow-up questions.',
    }),
  })
}

export function streamChatText(input: ChatInput) {
  return streamText({
    model: getLanguageModel(input.profile),
    ...getPromptOptions(input),
    ...getToolOptions(input),
  })
}
