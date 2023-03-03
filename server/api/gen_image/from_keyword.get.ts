import { doTranslate, doGenImage } from '../../service'
export default defineEventHandler(async (e) => {
  const query = getQuery(e)
  const { keyword, origin } = query
  const newKeyword = await doTranslate(keyword as string, '', '')
  const res = await doGenImage(origin as string, newKeyword)
  return {
    data: res
  }
})
