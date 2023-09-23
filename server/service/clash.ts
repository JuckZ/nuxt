import axios from 'axios'
import yaml from 'js-yaml'

import { loadYamlConfig, mixin, saveYamlConfig } from '@/server/util/index'

const runtimeConfig = useRuntimeConfig()

export const getClashSubscribe = async (keyword: string) => {
  let configUrl = ''
  if (keyword === runtimeConfig.clashSubKey) {
    // 返回私有订阅内容
    configUrl = runtimeConfig.clashSubUrl
  } else {
    // 返回免费订阅内容
    configUrl = runtimeConfig.freeClashSubUrl
  }
  // 从 URL 下载原始配置文件
  const originFileRes = await axios.get(configUrl, {
    headers: {
      "User-Agent": 'clash'
    }
  });

  // mixinConfig.headers中的subscription-userinfo等信息可以展示流量使用情况
  let mixinConfig = { mixin: {} }
  try {
    const mixinRes = await axios.get('/mixin.yaml')
    mixinConfig = yaml.load(mixinRes.data) as { mixin: object };
  } catch (error) {
    console.error(error)
  }
  let config = yaml.load(originFileRes.data) as any;
  const proxies = config['proxies'] as any[];
  const proxyGroups = config['proxy-groups'] as any[];
  const usProxies = proxies.filter(proxy => proxy.name.includes('美国')).map(proxy => proxy.name);
  const usProxyGroup = {
    name: '🤖 USProxy',
    type: 'select',
    proxies: usProxies
  };
  const allProxyGroup = {
    name: '🔰 AllProxy',
    type: 'select',
    proxies: [proxyGroups[0].name]
  }
  config['proxy-groups'] = config['proxy-groups'].concat(usProxyGroup).concat(allProxyGroup);
  config = mixin(config, mixinConfig.mixin)
  // saveYamlConfig('./public/mixedConfig.yaml', config)
  const newYamlStr = yaml.dump(config);
  originFileRes.data = newYamlStr;
  return originFileRes;
}
