import { ChatBaiduWenxin } from "langchain/chat_models/baiduwenxin";

const runtimeConfig = useRuntimeConfig()

const chatModel = new ChatBaiduWenxin({
  // modelName: 'ERNIE-Bot',
  modelName: 'ERNIE-Bot-turbo',
  baiduApiKey: runtimeConfig.wenxinqianfanAppKey,
  baiduSecretKey: runtimeConfig.wenxinqianfanAppSecret,
  streaming: false,
});

export const chatWithEnBot = async (keyword: string) => {
  const response = await chatModel.call([
    ['user', keyword],
  ])
  return response.content
}