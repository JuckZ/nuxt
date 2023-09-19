import { XiaoAiRequest, XiaoAiJsonResponse } from '@/server/entity/XiaoAiRequest';
import { xiaoAiEncrypt } from '@/server/util';
import * as crypto from 'crypto';

async function verifyToken(e: any) {
  const request = e.node.req;
  const reqBody = await readBody(e)
  // const params = getQuery(e)
  // TODO https://developers.xiaoai.mi.com/documents/Home?type=/api/doc/render_markdown/SkillAccess/skill/fulu/Signature#%E7%AD%BE%E5%90%8D%E6%96%B9%E6%B3%95%E7%89%88%E6%9C%AC
  // 将 query string 分成 {name, value} 的列表形式。如果 name 对应多个 value, 则组成多个 (name, value) 对，其中 name 按照字典序进行排列，一个 name 对应多个 value ，同样 value 也按照字典序进行排列（示例为：name1=value1&name2=value2& ... nameX=valueX）。
  const params = ""
  const realToken = request.headers['Authorization'] || request.headers['authorization'];
  const xiaoaiDate = request.headers['X-Xiaomi-Date'] || request.headers['x-xiaomi-date'];
  const contentMd5 = request.headers['content-md5'];
  const contentType = request.headers['content-type'];
  const host = request.headers['host'];
  const method = request.method!.toUpperCase();
  const originalUrl = '/api/xiaoai'
  const md5 = crypto.createHash('md5').update(JSON.stringify(reqBody), 'utf-8').digest('hex');
  console.log(contentMd5, md5);
  const { token: expectToken } = xiaoAiEncrypt(method, originalUrl, params, xiaoaiDate, host, contentType, md5);
  const { token: expectToken2 } = xiaoAiEncrypt(method, originalUrl, params, xiaoaiDate, host, contentType, "");
  const { token: expectToken3 } = xiaoAiEncrypt(method, originalUrl, params, xiaoaiDate, host, contentType, contentMd5);
  const { token: expectToken4 } = xiaoAiEncrypt(method, originalUrl, params, xiaoaiDate, host, "", contentMd5);
  const { token: expectToken5 } = xiaoAiEncrypt(method, originalUrl, params, xiaoaiDate, host, "", "");
  console.log(realToken);
  console.log(expectToken);
  console.log(expectToken2);
  console.log(expectToken3);
  console.log(expectToken4);
  console.log(expectToken5);
  console.log('=============');
  console.log(reqBody);
  return true;
}

export default defineEventHandler(async (e) => {
  const h5Url = 'intent://h5urlhttps://baidu.com'
  const appUri = 'appurlxxxxxx'
  const appUrl = 'intent://appurlxxxxxx'
  const method = e.node.req.method!.toUpperCase();
  const token = e.node.req.headers['Authorization'] || e.node.req.headers['authorization'];
  if (!await verifyToken(e)) {
    return
  }
  const originalUrl = '/api/xiaoai'
  const host = 'xiaoai.frps.ihave.cool'
  const xiaoaiDate = (new Date()).toUTCString();
  console.log(method, token);
  const actions: Record<string, XiaoAiJsonResponse> = {
    launchWithAppQuickAppH5: {
      "version": "1.0",
      "response": {
        "to_speak": {
          "type": 0,
          "text": "好的"
        },
        "open_mic": false,
        "not_understand": false,
        "action": "App.LaunchWithAppQuickAppH5",
        "action_property": {
          "app_intent_info": {
            "intent_type": "activity",
            "uri": appUri
          },
          "app_h5_url": h5Url
        }
      },
      "is_session_end": true
    },
    launchIntent: {
      "version": "1.0",
      "response": {
        "action": "App.LaunchIntent",
        "to_speak": {
          "type": 0,
          "text": "好的"
        },
        "open_mic": false,
        "not_understand": false,
        "action_property": {
          "app_intent_info": {
            "intent_type": "activity",
            "uri": appUrl
          }
        }
      },
      "is_session_end": true
    },
    launchQuickApp: {
      "version": "1.0",
      "is_session_end": true,
      "response": {
        "to_speak": {
          "text": "好的",
          "type": 0
        },
        "not_understand": false,
        "action": "App.LaunchQuickApp",
        "action_property": {
          "quick_app_path": "/pages/index?quickapp_params=params"
        }
      }
    },
    launchCard: {
      "version": "1.0",
      "is_session_end": false,
      "response": {
        "action": "App.LaunchCard",
        "to_speak": {
          "text": "正在打开卡片",
          "type": 0
        },
        "to_display": {
          "ui_type": 'phone',
          "phone_template": {
            "template_name": 'default_card',
            "params": {
              "title": "title",
              "subheading": 'subheading',
              "assistText": 'assistText',
              "tips": 'tips',
              "box0_title": "box0_title",
              "box0_subheading": "box0_subheading",
              "box0_assistText": "box0_assistText",
              "box0_tips": "box0_tips"
            }
          }
        },
        "open_mic": false,
        "not_understand": false,
        "action_property": {
          // "card_params": {
          // }
        }
      }
    },
    launchWithH5: {
      "version": "1.0",
      "is_session_end": true,
      "response": {
        "action": "App.LaunchWithH5",
        "to_speak": {
          "type": 0,
          "text": "正在打开"
        },
        "open_mic": false,
        "not_understand": false,
        "action_property": {
          "app_h5_url": h5Url
        }
      }
    }
  }

  const testRes = {
    "version": "1.0",
    "is_session_end": false,
    "response": {
      "to_speak": {
        "text": "正在播放溪流声",
        "type": 0
      },
      "to_display": {
        "ui_type": "phone",
        "phone_template": {
          "template_name": "media_card",
          "params": {
            "box0_image": 'https://xiaoai.frps.ihave.cool/avatar.png',
            "box0_tit": '你好',
            "box0_subTit": '小溪',
            "box0_audio": 'https://xiaoai.frps.ihave.cool/xiliu.mp3',
          }
        }
      },
      "open_mic": false,
      "not_understand": false,
      "action_property": {}
    }
  }
  const testRes1 = {
    "version": "1.0",
    "is_session_end": false,
    "response": {
      // "action": "leave_msg", // leave_msg leave_msg_and_asr
      "to_speak": {
        "text": "正在打开卡片",
        "type": 0
      },
      "to_display": {
        // type: 3, // 0：文字，1：html，2：native ui，3：widgets
        "ui_type": 'phone',
        "phone_template": {
          "template_name": 'default_card',
          "params": {
            "box0_subheading": "测试标题",
            "box0_assistText": "测试辅助文本",
            "box0_tips": "测试小贴士"
          }
        }
      },
      "open_mic": false,
      "not_understand": false,
      "action_property": {
        // "card_params": {
        // }
      }
    }
  }
  const runtimeConfig = useRuntimeConfig()
  const res = testRes1;
  const md5 = crypto.createHash('md5').update(JSON.stringify(res), 'utf-8').digest('hex');
  const params = ''
  const encryptRes = xiaoAiEncrypt(method, originalUrl!, params, xiaoaiDate, host!, "application/json", md5);
  e.node.res.setHeader('Authorization', `MIAI-HmacSHA256-V1 ${runtimeConfig.xiaoAiKeyId}::${encryptRes.signature}`)
  return res
})
