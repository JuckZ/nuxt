import { ChatGPTAPI } from 'chatgpt';

const runtimeConfig = useRuntimeConfig()

const chatGptApi = new ChatGPTAPI({
  apiKey: runtimeConfig.chatGptApiKey
})

export const chatWithChatGPT = async (keyword: string) => {
  const res = await chatGptApi.sendMessage(keyword)
  return res.text || ''
}
