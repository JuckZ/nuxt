import * as yaml from 'js-yaml'
import { z } from 'zod'

const nameSchema = z.string().trim().min(1).regex(/^[^\r\n]+$/)

export const clashProxySchema = z.looseObject({
  name: nameSchema,
  type: z.string().trim().min(1),
  'dialer-proxy': nameSchema.optional(),
})

const proxyGroupSchema = z.looseObject({
  name: nameSchema,
  type: z.string().trim().min(1),
  proxies: z.array(nameSchema).optional(),
  use: z.array(nameSchema).optional(),
})

export const clashDocumentSchema = z.looseObject({
  proxies: z.array(clashProxySchema).optional(),
  'proxy-groups': z.array(proxyGroupSchema).optional(),
  rules: z.array(z.string()).optional(),
})

const subscriptionSchema = z.object({
  name: nameSchema,
  url: z.url().refine(value => /^https?:\/\//i.test(value)),
  timeoutMs: z.number().int().min(100).max(60_000).default(10_000),
}).strict()

const sourceProfileSchema = z.object({
  subscriptions: z.array(subscriptionSchema).max(50).default([]),
  proxies: z.array(clashProxySchema).default([]),
}).strict().superRefine((profile, context) => {
  for (const field of ['subscriptions', 'proxies'] as const) {
    const names = new Set<string>()

    profile[field].forEach((item, index) => {
      if (names.has(item.name)) {
        context.addIssue({
          code: 'custom',
          path: [field, index, 'name'],
          message: 'Names must be unique within a source profile',
        })
      }

      names.add(item.name)
    })
  }
})

export const clashSourcesSchema = z.object({
  default: sourceProfileSchema.optional(),
  private: sourceProfileSchema.optional(),
}).strict()

export type ClashProxy = z.infer<typeof clashProxySchema>
export type ClashProxyGroup = z.infer<typeof proxyGroupSchema>
export type ClashDocument = z.infer<typeof clashDocumentSchema>
export type ClashSourceProfile = z.infer<typeof sourceProfileSchema>
export type ClashSubscriptionSource = z.infer<typeof subscriptionSchema>

export class ClashConfigError extends Error {}

export function parseSourcesConfig(source: string) {
  let value: unknown

  try {
    value = yaml.load(source)
  }
  catch {
    throw new ClashConfigError('Clash sources configuration is not valid YAML')
  }

  const parsed = clashSourcesSchema.safeParse(value)

  if (!parsed.success) {
    const fields = parsed.error.issues.map(issue => issue.path.join('.') || 'root')
    throw new ClashConfigError(`Invalid Clash sources configuration at: ${fields.join(', ')}`)
  }

  return parsed.data
}

export function parseClashDocument(source: string): ClashDocument {
  try {
    return clashDocumentSchema.parse(yaml.load(source))
  }
  catch {
    // YAML parser and validation errors can contain subscription credentials.
    throw new ClashConfigError('Expected a Clash/Mihomo YAML configuration with valid proxy entries')
  }
}
