import { createHash, randomBytes } from 'node:crypto'
import { createClient } from 'pexels'
import { colorSchema } from '#server/const/constants'

export type ImageOrigin = 'dummyimage' | 'pexels' | 'pixabay'

interface BaiduTranslateResponse {
  trans_result?: Array<{ dst: string, src: string }>
  error_code?: string
  error_msg?: string
}

interface PixabayResponse {
  hits?: Array<{ largeImageURL?: string }>
}

function md5(value: string) {
  return createHash('md5').update(value).digest('hex')
}

export async function translateToEnglish(keyword: string) {
  const value = keyword.trim()
  const { baiduTranslateAppId, baiduTranslateAppSecret } = useRuntimeConfig()

  if (!value) {
    throw createError({ statusCode: 400, statusMessage: 'A translation keyword is required' })
  }

  if (!baiduTranslateAppId || !baiduTranslateAppSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Baidu Translate is not configured' })
  }

  const salt = randomBytes(8).toString('hex')
  const response = await $fetch<BaiduTranslateResponse>(
    'https://fanyi-api.baidu.com/api/trans/vip/translate',
    {
      query: {
        q: value,
        from: 'zh',
        to: 'en',
        appid: baiduTranslateAppId,
        salt,
        sign: md5(`${baiduTranslateAppId}${value}${salt}${baiduTranslateAppSecret}`),
      },
    },
  )
  const translation = response.trans_result?.[0]?.dst

  if (!translation) {
    throw createError({
      statusCode: 502,
      statusMessage: response.error_msg ?? `Baidu Translate failed${response.error_code ? ` (${response.error_code})` : ''}`,
    })
  }

  return translation
}

export async function generateImageUrl(origin: ImageOrigin, keyword: string) {
  const config = useRuntimeConfig()

  switch (origin) {
    case 'pixabay': {
      if (!config.pixabayApiKey) {
        throw createError({ statusCode: 503, statusMessage: 'Pixabay is not configured' })
      }

      const response = await $fetch<PixabayResponse>('https://pixabay.com/api/', {
        query: {
          key: config.pixabayApiKey,
          q: keyword,
          image_type: 'photo',
          min_width: 600,
          order: 'popular',
          per_page: 3,
        },
      })

      return response.hits?.[0]?.largeImageURL ?? ''
    }

    case 'pexels': {
      if (!config.pexelsApiKey) {
        throw createError({ statusCode: 503, statusMessage: 'Pexels is not configured' })
      }

      const response = await createClient(config.pexelsApiKey).photos.search({
        query: keyword,
        size: 'large',
        per_page: 1,
      })

      return 'photos' in response ? response.photos[0]?.src.medium ?? '' : ''
    }

    case 'dummyimage': {
      const color = colorSchema[Math.floor(Math.random() * colorSchema.length)] ?? colorSchema[0]
      const text = encodeURIComponent(keyword)
      return `https://dummyimage.com/700x400/${color.bg.slice(1)}/${color.fg.slice(1)}.png&text=${text}`
    }
  }
}

export function isImageOrigin(value: string): value is ImageOrigin {
  return value === 'dummyimage' || value === 'pexels' || value === 'pixabay'
}
