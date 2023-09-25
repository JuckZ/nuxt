import { createRouter, defineEventHandler, useBase } from 'h3'
import { chatWithOpenAI, genImageWithChatGPT } from '@/server/service/openai'
import { chatWithBing } from '@/server/service/bing'
import { chatWithChatGPT } from '@/server/service/chatgpt'
import { chatWithSpark } from '@/server/service/spark'

const router = createRouter()

router.get(
  '/Spark',
  defineEventHandler(async (e) => {
    const query = getQuery(e)
    const { keyword } = query
    const res = await chatWithSpark(keyword as string)
    return {
      data: res
    }
    // return {
    //   data: '暂未开放此调用方式'
    // }
  })
)

router.get(
  '/ERNIE-Bot',
  defineEventHandler(async (e) => {
    const query = getQuery(e)
    const { keyword } = query
    const res = await chatWithSpark(keyword as string)
    return {
      data: res
    }
  })
)

router.get(
  '/OpenAI',
  defineEventHandler(async (e) => {
    const query = getQuery(e)
    const { keyword } = query
    const res = await chatWithOpenAI(keyword as string)
    return {
      data: res
    }
  })
)

router.get(
  '/Bing',
  defineEventHandler(async (e) => {
    const query = getQuery(e)
    const { keyword } = query
    const res = await chatWithBing(keyword as string)
    return {
      data: res
    }
  })
)

router.get(
  '/ChatGPT',
  defineEventHandler(async (e) => {
    const query = getQuery(e)
    const { keyword } = query
    const res = await chatWithChatGPT(keyword as string)
    return {
      data: res
    }
  })
)

router.get(
  '/GenImageWithChatGPT',
  defineEventHandler(async (e) => {
    const query = getQuery(e)
    const { keyword } = query
    const res = await genImageWithChatGPT(keyword as string)
    return {
      data: res
    }
  })
)

export default useBase('/api/aichat', router.handler)