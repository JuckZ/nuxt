import { createHash } from 'node:crypto'
import type {
  XiaoAiIntentSlots,
  XiaoAiJsonResponse,
  XiaoAiRequest,
} from '#server/entity/XiaoAiRequest'
import { generateChatText } from '#server/ai/gateway'
import { createXiaoAiAuthorization } from '#server/util'

type SessionResult =
  | { status: 'pending' }
  | { status: 'complete', text: string }
  | { status: 'failed', message: string }

const sessionResults = new Map<string, SessionResult>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseRequest(value: unknown): XiaoAiRequest {
  if (!isRecord(value) || !isRecord(value.session) || !isRecord(value.request)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid XiaoAI request' })
  }

  const intent = value.request.intent
  const sessionId = value.session.session_id

  if (!isRecord(intent) || typeof intent.query !== 'string' || typeof intent.slots !== 'string' || typeof sessionId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid XiaoAI request' })
  }

  return value as unknown as XiaoAiRequest
}

function parseIntentSlots(source: string): XiaoAiIntentSlots {
  try {
    const value: unknown = JSON.parse(source)

    if (isRecord(value) && typeof value.intent_name === 'string') {
      return value as unknown as XiaoAiIntentSlots
    }
  }
  catch {
    // The error below provides a stable API response.
  }

  throw createError({ statusCode: 400, statusMessage: 'Invalid XiaoAI intent slots' })
}

function makeResponse(options: {
  text: string
  subheading: string
  content?: string
  tips?: string
  sessionEnd?: boolean
  openMic?: boolean
  understood?: boolean
}): XiaoAiJsonResponse {
  return {
    version: '1.0',
    is_session_end: options.sessionEnd ?? true,
    response: {
      to_speak: {
        text: options.text,
        type: 0,
      },
      to_display: {
        ui_type: 'phone',
        phone_template: {
          template_name: 'default_card',
          params: {
            box0_subheading: options.subheading,
            box0_assistText: options.content ?? '',
            box0_tips: options.tips ?? '',
          },
        },
      },
      open_mic: options.openMic ?? false,
      not_understand: !(options.understood ?? true),
    },
  }
}

function beginQuestion(sessionId: string, question: string) {
  sessionResults.set(sessionId, { status: 'pending' })

  void generateChatText({
    profile: 'chat-fast',
    prompt: question,
    messages: undefined,
    tools: [],
  })
    .then((result) => {
      sessionResults.set(sessionId, { status: 'complete', text: result.text })
    })
    .catch((error: unknown) => {
      sessionResults.set(sessionId, {
        status: 'failed',
        message: error instanceof Error ? error.message : '回答生成失败',
      })
    })
}

function continueQuestion(sessionId: string, query: string) {
  if (query === '退出' || query === '再见') {
    sessionResults.delete(sessionId)
    return makeResponse({ text: '再见', subheading: query })
  }

  if (query !== '继续') {
    return makeResponse({
      text: '我还没学会这个技能，如果想问问题，请以“为什么”开头。',
      subheading: query,
      understood: false,
    })
  }

  const result = sessionResults.get(sessionId)

  if (!result || result.status === 'pending') {
    return makeResponse({
      text: '还在思考，请稍等后再说“继续”。',
      subheading: query,
      tips: '说“继续”获取答案',
      sessionEnd: false,
      openMic: true,
    })
  }

  sessionResults.delete(sessionId)

  if (result.status === 'failed') {
    return makeResponse({
      text: `抱歉，${result.message}`,
      subheading: query,
      understood: false,
    })
  }

  return makeResponse({
    text: result.text,
    subheading: query,
    tips: '回答完毕，请继续提问，或者说“退出”',
    sessionEnd: false,
  })
}

export default defineEventHandler(async (event) => {
  const request = parseRequest(await readBody(event))
  const intent = parseIntentSlots(request.request.intent.slots)
  const sessionId = request.session.session_id
  const query = request.query || request.request.intent.query
  let response: XiaoAiJsonResponse

  switch (intent.intent_name) {
    case 'Mi_Welcome':
      response = makeResponse({
        text: '你好，我是你的 AI 助手。你可以问我“为什么天是蓝色的？”',
        subheading: query,
        tips: '请说出你的问题',
        sessionEnd: false,
        openMic: true,
      })
      break

    case 'AskQuestion':
      beginQuestion(sessionId, request.request.intent.query)
      response = makeResponse({
        text: '正在思考，请稍后再说“继续”获取答案。',
        subheading: request.request.intent.query.replace(/^回答/, ''),
        content: '问题已经提交',
        tips: '说“继续”获取答案',
        sessionEnd: false,
        openMic: true,
      })
      break

    case 'Mi_Default':
      response = continueQuestion(sessionId, query)
      break

    case 'ExecuteCommand':
      response = makeResponse({
        text: `已经为你${request.request.intent.query}`,
        subheading: request.request.intent.query,
        understood: false,
      })
      break

    case 'Mi_Exit':
      sessionResults.delete(sessionId)
      response = makeResponse({ text: '再见', subheading: query })
      break

    default:
      response = makeResponse({
        text: '我没明白你的问题，请重新问我。',
        subheading: query,
        content: '连续失败可能会结束本次会话',
        sessionEnd: false,
        openMic: true,
        understood: false,
      })
  }

  const date = new Date().toUTCString()
  const config = useRuntimeConfig(event)
  const host = config.serverHost || getHeader(event, 'host') || 'localhost'
  const contentMd5 = createHash('md5').update(JSON.stringify(response), 'utf8').digest('hex')
  const authorization = createXiaoAiAuthorization({
    method: event.method,
    urlPath: '/api/xiaoai',
    date,
    host,
    contentType: 'application/json',
    contentMd5,
  })

  setResponseHeaders(event, {
    authorization,
    'content-md5': contentMd5,
    'x-xiaomi-date': date,
  })

  return response
})
