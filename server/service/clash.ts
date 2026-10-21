import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as yaml from 'js-yaml'
import {
  ClashConfigError,
  parseClashDocument,
  parseSourcesConfig,
  type ClashDocument,
  type ClashSourceProfile,
  type ClashSubscriptionSource,
} from '#server/clash/config'
import { ALL_PROXY_GROUP, mergeClashSources, US_PROXY_GROUP, validateSourceProxies } from '#server/clash/merge'

async function readMixin(): Promise<ClashDocument> {
  const source = await useStorage('assets:server').getItem<string>('mixin.yaml')

  if (!source) {
    return {}
  }

  try {
    const parsed = yaml.load(source) as { mixin?: unknown } | null
    return parseClashDocument(yaml.dump(parsed?.mixin ?? {}))
  }
  catch {
    throw createError({ statusCode: 500, statusMessage: 'The Clash mixin configuration is invalid' })
  }
}

function parsePrivateSources(source: string) {
  try {
    return parseSourcesConfig(source)
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof ClashConfigError ? error.message : 'Invalid Clash sources configuration',
    })
  }
}

async function readSourcesFile(file: string) {
  if (!file.trim()) {
    return undefined
  }

  let source: string

  try {
    source = await readFile(resolve(file), 'utf8')
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }

    throw createError({ statusCode: 503, statusMessage: 'Unable to read the private Clash sources file' })
  }

  return parsePrivateSources(source)
}

async function downloadSubscription(source: ClashSubscriptionSource) {
  try {
    const response = await fetch(source.url, {
      headers: { 'user-agent': 'clash' },
      signal: AbortSignal.timeout(source.timeoutMs),
    })

    if (!response.ok) {
      throw new Error('Upstream returned an unsuccessful status')
    }

    return {
      name: source.name,
      document: parseClashDocument(await response.text()),
      userInfo: response.headers.get('subscription-userinfo'),
    }
  }
  catch {
    // Never include an upstream URL, parser excerpt or credentials in an error.
    throw createError({ statusCode: 502, statusMessage: 'Unable to download a valid Clash YAML subscription' })
  }
}

function subscriptionResponse(document: ClashDocument, headers: Record<string, string> = {}) {
  return {
    body: yaml.dump(document, { noRefs: true, lineWidth: -1 }),
    headers: {
      'content-type': 'text/yaml; charset=utf-8',
      'cache-control': 'private, no-store',
      ...headers,
    },
  }
}

async function getMergedSubscription(profile: ClashSourceProfile, mixin: ClashDocument) {
  const results = await Promise.allSettled(profile.subscriptions.map(async (source) => {
    const downloaded = await downloadSubscription(source)
    const proxies = downloaded.document.proxies ?? []

    if (!proxies.length) {
      throw new ClashConfigError('The subscription has no inline proxy nodes')
    }

    validateSourceProxies(proxies)
    return { ...downloaded, proxies }
  }))

  const sources = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
  const failedCount = results.length - sources.length

  if (!sources.length && !profile.proxies.length && !mixin.proxies?.length) {
    throw createError({
      statusCode: 502,
      statusMessage: 'No usable Clash nodes: all subscription sources failed or contain no inline proxies',
    })
  }

  let merged: ClashDocument

  try {
    merged = mergeClashSources({ sources, proxies: profile.proxies, mixin })
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof ClashConfigError ? error.message : 'Unable to merge Clash nodes',
    })
  }

  const onlySource = sources[0]
  const userInfo = profile.subscriptions.length === 1 && !profile.proxies.length && !mixin.proxies?.length
    ? onlySource?.userInfo
    : null

  return subscriptionResponse(merged, {
    'x-clash-source-count': String(sources.length),
    'x-clash-failed-source-count': String(failedCount),
    ...(userInfo ? { 'subscription-userinfo': userInfo } : {}),
  })
}

async function getLegacySubscription(url: string, mixin: ClashDocument) {
  if (!url) {
    throw createError({ statusCode: 503, statusMessage: 'Clash subscription is not configured' })
  }

  const downloaded = await downloadSubscription({ name: 'legacy', url, timeoutMs: 10_000 })
  const config = downloaded.document
  const proxies = [...(config.proxies ?? []), ...(mixin.proxies ?? [])]
  const groups = [...(config['proxy-groups'] ?? []), ...(mixin['proxy-groups'] ?? [])]
  const firstGroup = groups[0]?.name

  if (!groups.some(group => group.name === ALL_PROXY_GROUP)) {
    groups.push({
      name: ALL_PROXY_GROUP,
      type: 'select',
      proxies: firstGroup ? [firstGroup] : proxies.length ? proxies.map(proxy => proxy.name) : ['DIRECT'],
    })
  }

  if (!groups.some(group => group.name === US_PROXY_GROUP)) {
    const usProxies = proxies.filter(proxy => /美国|美國|🇺🇸|\b(?:US|USA|United States)\b/iu.test(proxy.name))
    groups.push({
      name: US_PROXY_GROUP,
      type: 'select',
      proxies: usProxies.length ? usProxies.map(proxy => proxy.name) : [ALL_PROXY_GROUP],
    })
  }

  return subscriptionResponse({
    ...config,
    ...mixin,
    proxies,
    'proxy-groups': groups,
  }, downloaded.userInfo ? { 'subscription-userinfo': downloaded.userInfo } : {})
}

export async function getClashSubscription(key: string) {
  const config = useRuntimeConfig()
  const sourceYaml: unknown = config.clashSourcesYaml

  if (typeof sourceYaml !== 'string') {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_CLASH_SOURCES_YAML must contain YAML text' })
  }

  const sources = sourceYaml.trim()
    ? parsePrivateSources(sourceYaml)
    : await readSourcesFile(config.clashSourcesFile)
  const isPrivate = Boolean(config.clashSubKey && key === config.clashSubKey)
  const profile = isPrivate ? sources?.private : sources?.default
  const mixin = await readMixin()

  if (profile && (profile.subscriptions.length || profile.proxies.length || mixin.proxies?.length)) {
    return getMergedSubscription(profile, mixin)
  }

  return getLegacySubscription(isPrivate ? config.clashSubUrl : config.freeClashSubUrl, mixin)
}
