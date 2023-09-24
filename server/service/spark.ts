import WebSocket from 'ws'
import Keyv from 'keyv'
import * as crypto from 'crypto';


const runtimeConfig = useRuntimeConfig()

const Config = {
  xhmode: 'apiv2',
  xhAppId: runtimeConfig.sparkAppId,
  xhAPISecret: runtimeConfig.sparkApiSecret,
  xhAPIKey: runtimeConfig.sparkApiKey,
  xhAssistants: '',
  xhTemperature: 0.5,
  xhMaxTokens: 1024,
  xhPromptSerialize: false,
  xhPrompt: '',
  xhPromptEval: false,
  xhRetRegExp: '',
  xhRetReplace: '',
}

const referer = 'https://xinghuo.xfyun.cn/chat?id='
const origin = 'https://xinghuo.xfyun.cn'
const createChatUrl = 'https://xinghuo.xfyun.cn/iflygpt/u/chat-list/v1/create-chat-list'
export class XinghuoClient {
  cache: { namespace: string };
  headers: any;
  ssoSessionId: any;
  conversationsCache: any;

  constructor(opts: any) {
    this.cache = opts.cache
    this.ssoSessionId = opts.ssoSessionId
    this.headers = {
      Referer: referer,
      Cookie: 'ssoSessionId=' + this.ssoSessionId + ';',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/113.0.5672.69 Mobile/15E148 Safari/604.1',
      Origin: origin
    }
  }

  apiErrorInfo(code: any) {
    switch (code) {
      case 10000: return '升级为ws出现错误'
      case 10001: return '通过ws读取用户的消息出错'
      case 10002: return '通过ws向用户发送消息 错'
      case 10003: return '用户的消息格式有错误'
      case 10004: return '用户数据的schema错误'
      case 10005: return '用户参数值有错误'
      case 10006: return '用户并发错误：当前用户已连接，同一用户不能多处同时连接。'
      case 10007: return '用户流量受限：服务正在处理用户当前的问题，需等待处理完成后再发送新的请求。（必须要等大模型完全回复之后，才能发送下一个问题）'
      case 10008: return '服务容量不足，联系工作人员'
      case 10009: return '和引擎建立连接失败'
      case 10010: return '接收引擎数据的错误'
      case 10011: return '发送数据给引擎的错误'
      case 10012: return '引擎内部错误'
      case 10013: return '输入内容审核不通过，涉嫌违规，请重新调整输入内容'
      case 10014: return '输出内容涉及敏感信息，审核不通过，后续结果无法展示给用户'
      case 10015: return 'appid在黑名单中'
      case 10016: return 'appid授权类的错误。比如：未开通此功能，未开通对应版本，token不足，并发超过授权 等等'
      case 10017: return '清除历史失败'
      case 10019: return '表示本次会话内容有涉及违规信息的倾向；建议开发者收到此错误码后给用户一个输入涉及违规的提示'
      case 10110: return '服务忙，请稍后再试'
      case 10163: return '请求引擎的参数异常 引擎的schema 检查不通过'
      case 10222: return '引擎网络异常'
      case 10907: return 'token数量超过上限。对话历史+问题的字数太多，需要精简输入'
      case 11200: return '授权错误：该appId没有相关功能的授权 或者 业务量超过限制'
      case 11201: return '授权错误：日流控超限。超过当日最大访问量的限制'
      case 11202: return '授权错误：秒级流控超限。秒级并发超过授权路数限制'
      case 11203: return '授权错误：并发流控超限。并发路数超过授权路数限制'
      default: return '无效错误代码'
    }
  }

  async initCache() {
    if (!this.conversationsCache) {
      const cacheOptions = this.cache || { namespace: 'xh' }
      this.conversationsCache = new Keyv(cacheOptions)
    }
  }

  async getWsUrl() {
    const apiKey = Config.xhAPISecret
    const apiSecret = Config.xhAPIKey
    let APILink = '/v1.1/chat'
    if (Config.xhmode == 'apiv2') {
      APILink = '/v2.1/chat'
    }
    const host = 'spark-api.xf-yun.com'
    const date = new Date().toUTCString()
    const algorithm = 'hmac-sha256'
    var headers = 'host date request-line'
    var signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${APILink} HTTP/1.1`
    const hmac = crypto.createHmac('sha256', apiSecret)
    hmac.update(signatureOrigin)
    const signature = hmac.digest('base64')
    const authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
    const authorization = Buffer.from(authorizationOrigin).toString('base64')
    const url = `wss://spark-api.xf-yun.com${APILink}?authorization=${authorization}&date=${date}&host=${host}`
    return url
  }

  async apiMessage(prompt: any, chatId: string, ePrompt = []) {
    if (!chatId) chatId = (Math.floor(Math.random() * 1000000) + 100000).toString()

    //  初始化缓存
    await this.initCache()
    const conversationKey = `ChatXH_${chatId}`
    const conversation = (await this.conversationsCache.get(conversationKey)) || {
      messages: [],
      createdAt: Date.now()
    }


    // 获取ws链接
    const wsUrl = Config.xhmode == 'assistants' ? Config.xhAssistants : await this.getWsUrl()

    // 编写消息内容
    const wsSendData = {
      header: {
        app_id: Config.xhAppId,
        uid: chatId
      },
      parameter: {
        chat: {
          domain: Config.xhmode == 'api' ? "general" : "generalv2",
          temperature: Config.xhTemperature, // 核采样阈值
          max_tokens: Config.xhMaxTokens, // tokens最大长度
          chat_id: chatId,
          top_k: Math.floor(Math.random() * 6) + 1 // 随机候选，避免重复回复
        }
      },
      payload: {
        message: {
          "text": [
            ...ePrompt,
            ...conversation.messages,
            { "role": "user", "content": prompt }
          ]
        }
      }
    }

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl)
      let resMessage = ''
      socket.on('open', () => {
        socket.send(JSON.stringify(wsSendData))
      })
      socket.on('message', async (message: string) => {
        try {
          const messageData: any = JSON.parse(message)
          if (messageData.header.code != 0) {
            if (messageData.header.code == 10907) {
              const half = Math.floor(conversation.messages.length / 2)
              conversation.messages.splice(0, half)
              await this.conversationsCache.set(conversationKey, conversation)
              resolve({
                id: (Math.floor(Math.random() * 1000000) + 100000).toString(),
                response: '对话以达到上限，已自动清理对话，请重试'
              })
            } else {
              reject(`接口发生错误：Error Code ${messageData.header.code} ,${this.apiErrorInfo(messageData.header.code)}`)
            }
          }
          if (messageData.header.status == 0 || messageData.header.status == 1) {
            resMessage += messageData.payload.choices.text[0].content
          }
          if (messageData.header.status == 2) {
            resMessage += messageData.payload.choices.text[0].content
            conversation.messages.push({
              role: 'user',
              content: prompt
            })
            conversation.messages.push({
              role: 'assistant',
              content: resMessage
            })
            // 超过规定token去除一半曾经的对话记录
            if (messageData.payload.usage.text.total_tokens >= Config.xhMaxTokens) {
              const half = Math.floor(conversation.messages.length / 2)
              conversation.messages.splice(0, half)
            }
            await this.conversationsCache.set(conversationKey, conversation)
            resolve({
              id: chatId,
              response: resMessage
            })
          }
        } catch (error) {
          reject(new Error(error as string))
        }
      })
      socket.on('error', (error) => {
        reject(error)
      })
    })
  }


  async sendMessage(prompt: string, option?: { chatId: any; e: any; }) {
    let chatId = option?.chatId
    if (!Config.xhAppId || !Config.xhAPISecret || !Config.xhAPIKey) throw new Error('未配置api')
    let Prompt = []
    if (Config.xhPromptSerialize) {
      try {
        Prompt = JSON.parse(Config.xhPrompt)
      } catch (error) {
        Prompt = []
      }
    } else {
      Prompt = Config.xhPrompt ? [{ "role": "user", "content": Config.xhPrompt }] : []
    }
    if (Config.xhPromptEval) {
      Prompt.forEach((obj: { content: string }) => {
        try {
          obj.content = obj.content.replace(/{{(.*?)}}/g, (match: any, variable: any) => {
            return Function(`"use strict";return ((e)=>{return ${variable} })`)()(option!.e)
          })
        } catch (error) {
        }
      })
    }

    let { response, id } = await this.apiMessage(prompt, chatId, Prompt) as { response: any, id: any }
    if (Config.xhRetRegExp) {
      response = response.replace(new RegExp(Config.xhRetRegExp, 'g'), Config.xhRetReplace)
    }
    return {
      conversationId: id,
      text: response
    }
  }

  async createChatList(bot = false) {
    let createChatListRes = await fetch(createChatUrl, {
      method: 'POST',
      headers: Object.assign(this.headers, {
        'Content-Type': 'application/json',
        Botweb: bot ? 1 : 0
      }),
      body: bot ? `{"BotWeb": 1, "botId": "${bot}"}` : '{}'
    })
    if (createChatListRes.status !== 200) {
      let errorRes = await createChatListRes.text()
      let errorText = '星火对话创建失败：' + errorRes
      throw new Error(errorText)
    }
    createChatListRes = await createChatListRes.json()
    if (createChatListRes.data?.id) {
    } else {
      throw new Error('星火对话创建失败:' + JSON.stringify(createChatListRes))
    }
    return {
      chatListId: createChatListRes.data?.id,
      title: createChatListRes.data?.title
    }
  }
}

const chatModel = new XinghuoClient({
  ssoSessionId: '',
  cache: {
    namespace: 'spark'
  }
});

export const chatWithSpark = async (keyword: string) => {
  const response = await chatModel.sendMessage(keyword)
  return response.text
}