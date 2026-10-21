import { translateToEnglish } from '#server/service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const keyword = typeof query.keyword === 'string' ? query.keyword : ''

  return {
    data: await translateToEnglish(keyword),
  }
})
