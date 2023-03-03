import { BingChat } from 'bing-chat'
import { oraPromise } from 'ora'
const bingChatApi = new BingChat({ cookie: process.env.BINGNEW_APIKEY || '' })
export const chatWithBing = async (keyword: string) => {
  const res = await oraPromise(bingChatApi.sendMessage(keyword), {
    text: keyword
  })
  return res.text
}
