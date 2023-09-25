import { XiaoAiRequest, XiaoAiJsonResponse } from '@/server/entity/XiaoAiRequest';
import { xiaoAiEncrypt } from '@/server/util';
// import { defaultResponse, verifyToken } from '@/server/service/xiaoai';
// import { chatWithChatGPT } from '@/server/service/chatgpt'
// import { chatWithEnBot } from '@/server/service/wenxinqianfan'
import { chatWithSpark } from '@/server/service/spark'
import * as crypto from 'crypto';

const runtimeConfig = useRuntimeConfig()
const serverHost = useRuntimeConfig().serverHost
const sessionRes: Record<string, string> = {}
export default defineEventHandler(async (e) => {
  const method = e.node.req.method!.toUpperCase();
  // const token = e.node.req.headers['Authorization'] || e.node.req.headers['authorization'];
  // if (!await verifyToken(e)) {
  //   return
  // }
  const reqBody: XiaoAiRequest = await readBody(e);
  const intent = reqBody.request.intent
  const intentSlots: {
    intent_name: string;
    slots: {
      name: string;
      value: string;
      raw_value: string;
    }[]
  } = JSON.parse(intent.slots)
  let toSpeakText = ''
  let subHeading = intent.query
  let content = ''
  let isSessionEnd = true
  let openMic = false
  let understand = true
  let tips = ''
  switch (intentSlots.intent_name) {
    case 'Mi_Welcome':
      toSpeakText = '你好，我是一只猪，你可以对我说，“为什么天是蓝色的？”或者告诉我“打开百度网页”'
      isSessionEnd = false
      openMic = true
      tips = '你可以开始说出你的命令了'
      break;
    case 'AskQuestion':
      try {
        toSpeakText = '小爱正在思考中，请稍等片刻再说“继续”获取答案';
        chatWithSpark(subHeading).then(res => {
          sessionRes[reqBody.session.session_id] = res
        });
      } catch (error) {
        console.error(error)
      }
      isSessionEnd = false
      openMic = true
      tips = '说“继续”我会为你提供后续答案'
      content = toSpeakText;
      subHeading = subHeading.replace(/^回答/, "");
      break;
    case 'Mi_Default':
      try {
        if (reqBody.query === '继续') {
          if (!sessionRes[reqBody.session.session_id]) {
            toSpeakText = '还在思考呢，请稍等再说"继续"'
            isSessionEnd = false
            openMic = true
            tips = '说“继续”我会为你提供后续答案'
          } else {
            toSpeakText = sessionRes[reqBody.session.session_id]
            isSessionEnd = false
            openMic = false
            delete sessionRes[reqBody.session.session_id]
            tips = '回答完毕，请继续提问，或者说“退出”、“再见”'
          }
        } else if (reqBody.query === '退出' || reqBody.query === '再见') {
          toSpeakText = '再见'
          isSessionEnd = true
          openMic = false
        } else {
          toSpeakText = '哎呀，我还没学会这个技能呢，如果你想问我问题，请用为什么开头'
          isSessionEnd = true
          openMic = false
        }
      } catch (error) {
        console.error(error)
      }
      content = toSpeakText;
      subHeading = subHeading.replace(/^回答/, "");
      break;
    case 'ExecuteCommand':
      toSpeakText = `已经为你${subHeading}`
      understand = false
      isSessionEnd = true
      content = toSpeakText;
      break;
    case "Mi_Exit":
      toSpeakText = '再见'
      isSessionEnd = true
      openMic = false
      break;
    default:
      toSpeakText = '我没明白你的问题，请重新问我吧'
      content = '失败三次就会退出本次回话'
      isSessionEnd = false
      openMic = true
      understand = false
      break;
  }
  const originalUrl = '/api/xiaoai'
  const xiaoaiDate = (new Date()).toUTCString();
  const res = {
    "version": "1.0",
    "is_session_end": isSessionEnd,
    "response": {
      "to_speak": {
        "text": toSpeakText,
        "type": 0
      },
      "to_display": {
        "ui_type": 'phone',
        "phone_template": {
          "template_name": 'default_card',
          "params": {
            "box0_subheading": subHeading,
            "box0_assistText": content,
            "box0_tips": tips
          }
        }
      },
      "open_mic": openMic,
      "not_understand": !understand,
    }
  }
  const md5 = crypto.createHash('md5').update(JSON.stringify(res), 'utf-8').digest('hex');
  const params = ''
  const encryptRes = xiaoAiEncrypt(method, originalUrl!, params, xiaoaiDate, serverHost, "application/json", md5);
  e.node.res.setHeader('Authorization', `MIAI-HmacSHA256-V1 ${runtimeConfig.xiaoAiKeyId}::${encryptRes.signature}`)
  return res
})