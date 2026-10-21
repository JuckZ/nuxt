import { z } from 'zod'

export const AI_PROFILES = ['chat-fast', 'chat-quality', 'reasoning'] as const
export const AI_TOOL_NAMES = ['current-time'] as const

export type AiProfile = typeof AI_PROFILES[number]
export type AiToolName = typeof AI_TOOL_NAMES[number]

export const aiProfileSchema = z.enum(AI_PROFILES)
export const aiToolNameSchema = z.enum(AI_TOOL_NAMES)

export const aiChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().trim().min(1).max(64_000),
}).strict()

export const structuredChatOutputSchema = z.object({
  answer: z.string().describe('The direct answer to the user'),
  summary: z.string().describe('A short summary of the answer'),
  followUps: z.array(z.string()).max(5).describe('Suggested follow-up questions'),
})

export const aiChatRequestSchema = z.object({
  profile: aiProfileSchema.default('chat-fast'),
  prompt: z.string().trim().min(1).max(64_000).optional(),
  messages: z.array(aiChatMessageSchema).min(1).max(100).optional(),
  stream: z.boolean().default(true),
  responseFormat: z.enum(['text', 'structured']).default('text'),
  tools: z.array(aiToolNameSchema).max(AI_TOOL_NAMES.length).default([]),
}).strict().superRefine((value, context) => {
  if ((value.prompt === undefined) === (value.messages === undefined)) {
    context.addIssue({
      code: 'custom',
      message: 'Provide exactly one of prompt or messages',
      path: ['prompt'],
    })
  }

  if (value.stream && value.responseFormat === 'structured') {
    context.addIssue({
      code: 'custom',
      message: 'Structured responses currently require stream=false',
      path: ['stream'],
    })
  }
})

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>
export type AiChatRequest = z.infer<typeof aiChatRequestSchema>
export type StructuredChatOutput = z.infer<typeof structuredChatOutputSchema>
