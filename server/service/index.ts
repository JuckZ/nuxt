import crypto from 'crypto'
import { BaiduTranslate } from '../config/BaiduTranslate'
import { createClient } from 'pexels'
import { colorSchema } from '../const/constants'

const salt = 'random'
const runtimeConfig = useRuntimeConfig()
const baiduTranslateConfig = new BaiduTranslate(
  runtimeConfig.baiduTranslateAppid,
  runtimeConfig.baiduTranslateAppsecret
)

function encrypt(str: string) {
  const md5 = crypto.createHash('md5')
  return md5.update(str).digest('hex')
}
export async function doTranslate(keyword: string, from: string, to: string) {
  console.error(baiduTranslateConfig.getAppId())
  const sign = encrypt(
    baiduTranslateConfig.getAppId() + keyword + salt + baiduTranslateConfig.getAppSecret()
  )
  const url =
    'https://fanyi-api.baidu.com/api/trans/vip/translate?q=' +
    encodeURI(keyword) +
    '&from=zh&to=en&appid=' +
    baiduTranslateConfig.getAppId() +
    '&salt=' +
    salt +
    '&sign=' +
    sign
  const data = (await $fetch(url)) as any
  return data.trans_result[0].dst
}

const pexelsClient = createClient(runtimeConfig.pexelsApikey)

export async function doGenImage(origin: string, keyword: string) {
  switch (origin) {
    case 'pixabay':
      const data: any = await new Promise((resolve, reject) => {
        $fetch(
          `https://pixabay.com/api/?key=${runtimeConfig.pixabayApikey}&q=${keyword}&image_type=photo&pretty=true&min_width=600&order=popular`
        )
          .then((res) => {
            resolve(res)
          })
          .catch((error) => reject(error))
      })
      return data?.hits[0]?.largeImageURL || ''
    case 'pexels':
      const pexelsRes: any = await new Promise((resolve, reject) => {
        pexelsClient.photos
          .search({ query: keyword, size: 'large', per_page: 1 })
          .then((photos: any) => {
            resolve(photos)
          })
      })
      return pexelsRes?.photos[0]?.src?.medium || ''
    case 'dummyimage':
      const color = colorSchema[Math.floor(Math.random() * colorSchema.length)]
      return (
        'https://dummyimage.com/700x400/' +
        color.bg.replace('#', '') +
        '/' +
        color.fg.replace('#', '') +
        '.png&text=' +
        keyword
      )
    default:
      break
  }
}
