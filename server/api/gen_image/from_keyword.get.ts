import { generateImageUrl, isImageOrigin, translateToEnglish } from '#server/service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const keyword = typeof query.keyword === 'string' ? query.keyword : ''
  const origin = typeof query.origin === 'string' ? query.origin : 'dummyimage'

  if (!isImageOrigin(origin)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'origin must be one of: dummyimage, pexels, pixabay',
    })
  }

  const translatedKeyword = await translateToEnglish(keyword)

  return {
    data: await generateImageUrl(origin, translatedKeyword),
  }
})
