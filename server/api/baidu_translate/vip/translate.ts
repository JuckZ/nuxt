import { doTranslate } from '../../../service'
export default defineEventHandler(async (e) => {
  // console.log(e.context.params)
  // const body = await readBody(event)
  const query = getQuery(e)
  const { keyword } = query
  const data = await doTranslate(keyword as string, '', '')
  return {
    data
  }
})
