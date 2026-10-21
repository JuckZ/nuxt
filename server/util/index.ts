import { createHmac } from 'node:crypto'

interface XiaoAiSignatureInput {
  method: string
  urlPath: string
  query?: string
  date: string
  host: string
  contentType?: string
  contentMd5?: string
}

export function createXiaoAiAuthorization(input: XiaoAiSignatureInput) {
  const { xiaoAiKeyId, xiaoAiSecret } = useRuntimeConfig()

  if (!xiaoAiKeyId || !xiaoAiSecret) {
    throw createError({ statusCode: 503, statusMessage: 'XiaoAI is not configured' })
  }

  const source = [
    input.method.toUpperCase(),
    input.urlPath,
    input.query ?? '',
    input.date,
    input.host,
    input.contentType ?? '',
    input.contentMd5 ?? '',
    '',
  ].join('\n')
  const signature = createHmac('sha256', Buffer.from(xiaoAiSecret, 'base64'))
    .update(source, 'utf8')
    .digest('hex')

  return `MIAI-HmacSHA256-V1 ${xiaoAiKeyId}::${signature}`
}
