import { getClashSubscription } from '#server/service/clash'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const keyword = typeof query.keyword === 'string' ? query.keyword : ''
  const response = await getClashSubscription(keyword)

  setResponseHeaders(event, response.headers)
  return response.body
})
