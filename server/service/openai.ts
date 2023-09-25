// import { Configuration, OpenAIApi } from 'openai'
import { OpenAI } from 'openai'

const runtimeConfig = useRuntimeConfig()

const openai = new OpenAI({
  apiKey: runtimeConfig.openaiApikey
})

export const chatWithOpenAI = async (keyword: string) => {
  const completion = await openai.chat.completions.create({
    model: 'text-davinci-003',
    messages: [{role: 'user', content: keyword}]
  })
  return completion.choices[0].message.content || ''
}

export const genImageWithChatGPT = async (keyword: string) => {
  const completion = await openai.images.generate({
    prompt: keyword,
    n: 1
  })

  return completion.data[0].url || ''
}
