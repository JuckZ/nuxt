import { getClashSubscribe } from '@/server/service/clash'

export default defineEventHandler(async (e) => {
  const query = getQuery(e)
  const { keyword } = query
  const response = await getClashSubscribe(keyword?.toString() || 'free');
  const res = e.node.res
  Object.keys(response.headers).forEach((key) => {
     res.setHeader(key, response.headers[key])
  })
  res.end(response.data)
  return res
})
