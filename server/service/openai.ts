import { Configuration, OpenAIApi } from 'openai'

const runtimeConfig = useRuntimeConfig()

const configuration = new Configuration({
  apiKey: runtimeConfig.openaiApikey
})
const openai = new OpenAIApi(configuration)

export const chatWithOpenAI = async (keyword: string) => {
  const completion = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: keyword
  })
  return completion.data.choices[0].text || ''
}

export const genImageWithChatGPT = async (keyword: string) => {
  const completion = await openai.createImage({
    prompt: keyword,
    n: 1
  })

  return completion.data.data[0].url || ''
}
