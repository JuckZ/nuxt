import { XiaoAiRequest, XiaoAiJsonResponse } from '@/server/entity/XiaoAiRequest';
import { xiaoAiEncrypt } from '@/server/util';
import * as crypto from 'crypto';

const runtimeConfig = useRuntimeConfig()

const h5Url = 'intent://h5urlhttps://baidu.com'
const appUri = 'appurlxxxxxx'
const appUrl = 'intent://appurlxxxxxx'

export async function verifyToken(e: any) {
  const request = e.node.req;
  const reqBody: XiaoAiRequest = await readBody(e)
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

const defaultCard = {
  "version": "1.0",
  "is_session_end": false,
  "response": {
    // "action": "leave_msg", // leave_msg leave_msg_and_asr
    "to_speak": {
      "text": "小爱正在思考中……",
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

const mediaCard = {
  "version": "1.0",
  "is_session_end": false,
  "response": {
    "to_speak": {
      "text": "正在展示媒体卡片",
      "type": 0
    },
    "to_display": {
      "ui_type": "phone",
      "phone_template": {
        "template_name": "media_card",
        "params": {
          "box0_image": `https://${runtimeConfig.serverHost}/avatar126.png`,
          "box0_tit": '你好',
          "box0_subTit": '小溪',
          "box0_audio": `https://${runtimeConfig.serverHost}/mini.mp3`,
        }
      }
    },
    "open_mic": false,
    "not_understand": false,
    "action_property": {}
  }
}

const interactionCard = {
  "version": "1.0",
  "is_session_end": false,
  "response": {
    "to_speak": {
      "text": "正在展示交互卡片",
      "type": 0
    },
    "to_display": {
      "ui_type": "phone",
      "phone_template": {
        "template_name": "interaction_card",
        "params": {
          "box0_subheading": "你好",
          "box0_table.thead": [
            "用户名",
            "总金币",
            "当前排名"
          ],
          "box0_table.tbody": [
            "测试1",
            "1000",
            "23",
            "测试2",
            "500",
            "25"
          ],
          "box0_link": {
            "content": "这是一个超链接",
            "action": [
              // {
              //   "type": "jump_url", // 跳转到特定的url（h5页面，这里特指快应用的web view）
              //   "param": "https://www.mi.com"
              // },
              {
                "type": "jump_browser",
                "param": "https://www.baidu.com"
              },
            ]
          }
        }
      }
    },
    "open_mic": false,
    "not_understand": false,
    "action_property": {}
  }
}

const priceCard = {
  "version": "1.0",
  "is_session_end": false,
  "response": {
    "to_speak": {
      "text": "正在展示价格卡片",
      "type": 0
    },
    "to_display": {
      "ui_type": "phone",
      "phone_template": {
        "template_name": "price_card",
        "params": {
          "box0": [
            {
              "box0_tit": "复仇者联盟4",
              "box0_subTit": "龙旗广场保利国际影城",
              "box0_tips": "距离100米",
              "box0_price": "19.9元",
              "box0_priceLabel": "100米"
            },
            {
              "box0_tit": "寒战",
              "box0_subTit": "龙旗广场保利国际影城",
              "box0_tips": "距离300米",
              "box0_price": "39.9元",
              "box0_priceLabel": "300米"
            },
            {
              "box0_tit": "无间道",
              "box0_subTit": "龙旗广场保利国际影城",
              "box0_tips": "距离500米",
              "box0_price": "20.9元",
              "box0_priceLabel": "200米"
            },
            {
              "box0_tit": "无间道",
              "box0_subTit": "龙旗广场保利国际影城",
              "box0_tips": "距离500米",
              "box0_price": "20.9元",
              "box0_priceLabel": "200米"
            },
          ]
        }
      }
    },
    "open_mic": false,
    "not_understand": false,
    "action_property": {}
  }
}

const movieList = {
  "version": "1.0",
  "is_session_end": false,
  "response": {
    "to_speak": {
      "text": "正在展示电影卡片",
      "type": 0
    },
    "to_display": {
      "ui_type": "phone",
      "phone_template": {
        "template_name": "movie_list",
        "params": {
          "box0_title": "附近的电影",
          // TODO 图片不展示，即使是292*390分辨率
          "box0_image1": `https://${runtimeConfig.serverHost}/pic1292390.jpg`,
          "box0_image2": "https://file.ai.xiaomi.com/anonymous/file/5a9435d25400400fd2d4ff08",
          "box0_image3": "https://file.ai.xiaomi.com/anonymous/file/5a943365e400400f412d7a58",
          "box0_score1": "9.7",
          "box0_score2": "9.0",
          "box0_score3": "9.5",
          "box0_category1": "生活",
          "box0_category2": "动作",
          "box0_category3": "冒险",
          "box0_filmName1": "拯救大兵瑞恩",
          "box0_filmName2": "寒战",
          "box0_filmName3": "勇敢的心",
          "box0_btn": {
            "content": "换一换",
            "action": [
              {
                "type": "requery",
                "param": "换电影"
              }
            ]
          }
        }
      }
    },
    "open_mic": false,
    "not_understand": false,
    "action_property": {}
  }
}

const mixCard = {
  "version": "1.0",
  "is_session_end": false,
  "response": {
    "to_speak": {
      "text": "正在展示复杂内容",
      "type": 0
    },
    "to_display": {
      "ui_type": "phone",
      "phone_template": {
        "template_name": "mix_card",
        "params": {
          "box3_secondButton": "附近的电影2",
          "box6_tit": "123",
          "box6_filmName": "拯救大兵瑞恩",
          "box6_filmDate": "2022-01-01",
          "box6_filmSite": "https://baidu.com",
          "box6_image": "https://file.ai.xiaomi.com/anonymous/file/5a9435d25400400fd2d4ff08",
          "box2_firstButton": {
            "content": "换一换",
            "action": [
              {
                "type": "requery",
                "param": "换电影"
              }
            ]
          },
        }
      }
    },
    "open_mic": false,
    "not_understand": false,
    "action_property": {}
  }
}

export const actions: Record<string, XiaoAiJsonResponse> = {
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

export const defaultResponse = mediaCard