import { getClashSubscribe } from '@/server/service/clash'

export default defineEventHandler(async (e) => {
  const query = getQuery(e)
  const { keyword } = query
  const newYamlStr = await getClashSubscribe(keyword?.toString() || 'free');
  // 返回一个文件，而不是文件的内容
  // const response = new Response(newYamlStr)
  // 设置 Content-Disposition 头，使浏览器将响应作为文件下载
  // response.setHeader('Content-Disposition', `attachment; filename=modified.yaml`);
  return newYamlStr
})
