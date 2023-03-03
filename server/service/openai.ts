import { Configuration, OpenAIApi } from 'openai'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_APIKEY
})
const openai = new OpenAIApi(configuration)

export const chatWithOpenAI = async (keyword: string) => {
  console.log('chatWithOpenAI')
  const completion = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: keyword
  })
  console.log(completion)

  return completion.data.choices[0].text || ''
}

export const genImageWithChatGPT = async (keyword: string) => {
  const completion = await openai.createImage({
    prompt: keyword,
    n: 1
  })

  return completion.data.data[0].url || ''
}
