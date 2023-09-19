import { XiaoAiRequest, XiaoAiJsonResponse } from '@/server/entity/XiaoAiRequest';
import { xiaoAiEncrypt } from '@/server/util';
import { defaultResponse, verifyToken } from '@/server/service/xiaoai';
import { chatWithChatGPT } from '@/server/service/chatgpt'
import * as crypto from 'crypto';

const runtimeConfig = useRuntimeConfig()
const serverHost = useRuntimeConfig().serverHost

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
  console.log(reqBody, intentSlots.intent_name, intentSlots.slots);
  let toSpeakText = ''
  let subHeading = intent.query
  let content = ''
  let isSessionEnd = true
  let openMic = false
  let understand = true
  switch (intentSlots.intent_name) {
    case 'AskQuestion':
      try {
        toSpeakText = await chatWithChatGPT(subHeading);
      } catch (error) {
        console.error(error)
      }
      content = toSpeakText;
      subHeading = subHeading.replace(/^回答/, "");
      break;
    case 'ExecuteCommand':
      toSpeakText = `已经为你${subHeading}`
      content = toSpeakText;
      // TODO 增加重试逻辑，上下文不一样了，可能需要传递部分数据到后续阶段的回话
      // if (subHeading.includes('浏览器')) {
      //   toSpeakText = `我还没学会帮你${subHeading}，请换个命令吧`
      //   content = '失败三次就会退出本次回话'
      //   isSessionEnd = false
      //   openMic = true
      //   understand = false
      // }
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
            // "box0_tips": "测试小贴士"
            // "box0_tips": {
            //   "content": "重试",
            //   "action": [
            //     {
            //       "type": "requery",
            //       "param": "重试"
            //     },
            //   ]
            // }
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
