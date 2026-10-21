import { getClashSubscription } from '#server/service/clash'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawKey = query.k ?? query.keyword ?? ''

  if (typeof rawKey !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'The subscription key must be a single string' })
  }

  const response = await getClashSubscription(rawKey)

  setResponseHeaders(event, response.headers)
  return response.body
})
