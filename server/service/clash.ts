import * as yaml from 'js-yaml'

interface ClashProxy {
  name: string
  [key: string]: unknown
}

interface ClashProxyGroup {
  name: string
  proxies?: string[]
  type?: string
  [key: string]: unknown
}

interface ClashConfig {
  proxies?: ClashProxy[]
  'proxy-groups'?: ClashProxyGroup[]
  [key: string]: unknown
}

interface MixinConfig {
  mixin?: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseClashConfig(source: string): ClashConfig {
  const config = yaml.load(source)

  if (!isRecord(config)) {
    throw createError({ statusCode: 502, statusMessage: 'The Clash subscription is not valid YAML' })
  }

  return config as ClashConfig
}

async function readMixin() {
  const source = await useStorage('assets:server').getItem<string>('mixin.yaml')

  if (!source) {
    return {}
  }

  const parsed = yaml.load(source)
  return isRecord(parsed) ? parsed as MixinConfig : {}
}

export async function getClashSubscription(key: string) {
  const config = useRuntimeConfig()
  const subscriptionUrl = key && key === config.clashSubKey
    ? config.clashSubUrl
    : config.freeClashSubUrl

  if (!subscriptionUrl) {
    throw createError({ statusCode: 503, statusMessage: 'Clash subscription is not configured' })
  }

  const response = await fetch(subscriptionUrl, {
    headers: { 'user-agent': 'clash' },
  })

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Unable to download Clash subscription (${response.status})`,
    })
  }

  const clashConfig = parseClashConfig(await response.text())
  const proxies = clashConfig.proxies ?? []
  const proxyGroups = clashConfig['proxy-groups'] ?? []
  const firstGroupName = proxyGroups[0]?.name

  const generatedGroups: ClashProxyGroup[] = [
    {
      name: '🤖 USProxy',
      type: 'select',
      proxies: proxies.filter(proxy => proxy.name.includes('美国')).map(proxy => proxy.name),
    },
  ]

  if (firstGroupName) {
    generatedGroups.push({
      name: '🔰 AllProxy',
      type: 'select',
      proxies: [firstGroupName],
    })
  }

  const mixin = await readMixin()
  const mergedConfig: ClashConfig = {
    ...clashConfig,
    ...(mixin.mixin ?? {}),
    'proxy-groups': [...proxyGroups, ...generatedGroups],
  }

  return {
    body: yaml.dump(mergedConfig),
    headers: {
      'content-type': 'text/yaml; charset=utf-8',
      ...(response.headers.get('subscription-userinfo')
        ? { 'subscription-userinfo': response.headers.get('subscription-userinfo')! }
        : {}),
    },
  }
}
