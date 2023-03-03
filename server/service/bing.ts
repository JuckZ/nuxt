import { BingChat } from 'bing-chat'
import { oraPromise } from 'ora'

const runtimeConfig = useRuntimeConfig()
const bingChatApi = new BingChat({ cookie: runtimeConfig.bingnewApikey })
export const chatWithBing = async (keyword: string) => {
  const res = await oraPromise(bingChatApi.sendMessage(keyword), {
    text: keyword
  })
  return res.text
}
