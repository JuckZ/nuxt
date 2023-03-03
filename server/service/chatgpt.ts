import { ChatGPTAPI } from 'chatgpt';

const chatGptApi = new ChatGPTAPI({
  apiKey: process.env.CHATGPT_APIKEY || ''
})

export const chatWithChatGPT = async (keyword: string) => {
  const res = await chatGptApi.sendMessage(keyword)
  console.log(res);
  return res.text || ''
}
