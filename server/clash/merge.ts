import {
  ClashConfigError,
  type ClashDocument,
  type ClashProxy,
  type ClashProxyGroup,
} from './config'

export const ALL_PROXY_GROUP = '🔰 AllProxy'
export const US_PROXY_GROUP = '🤖 USProxy'
export const MANUAL_PROXY_GROUP = '🛠 独立节点'

const builtinTargets = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'COMPATIBLE', 'GLOBAL'])
const usNodePattern = /美国|美國|🇺🇸|\b(?:US|USA|United States)\b/iu

export interface NamedClashSource {
  name: string
  proxies: ClashProxy[]
}

function uniqueName(preferred: string, names: Set<string>) {
  let name = preferred
  let suffix = 2

  while (names.has(name)) {
    name = `${preferred} (${suffix++})`
  }

  names.add(name)
  return name
}

export function validateSourceProxies(proxies: ClashProxy[]) {
  const names = new Set(proxies.map(proxy => proxy.name))

  if (names.size !== proxies.length) {
    throw new ClashConfigError('Proxy names must be unique within each source')
  }

  const dependencies = new Map(proxies.map(proxy => [proxy.name, proxy['dialer-proxy']]))

  for (const proxy of proxies) {
    const visited = new Set([proxy.name])
    let target = proxy['dialer-proxy']

    while (target && !builtinTargets.has(target)) {
      if (!names.has(target) || visited.has(target)) {
        throw new ClashConfigError('A node has an unresolved or circular dialer-proxy reference')
      }

      visited.add(target)
      target = dependencies.get(target)
    }
  }
}

export function mergeClashSources(options: {
  sources: NamedClashSource[]
  proxies: ClashProxy[]
  mixin: ClashDocument
}): ClashDocument {
  const customGroups = options.mixin['proxy-groups'] ?? []
  const names = new Set([...builtinTargets, ALL_PROXY_GROUP, US_PROXY_GROUP, MANUAL_PROXY_GROUP])

  for (const group of customGroups) {
    if (names.has(group.name)) {
      throw new ClashConfigError('A mixin proxy group has a duplicate or reserved name')
    }

    names.add(group.name)
  }

  const proxies: ClashProxy[] = []
  const sourceGroups: ClashProxyGroup[] = []
  const usNodes: string[] = []

  const addProxies = (items: ClashProxy[], prefix: string) => {
    validateSourceProxies(items)
    const aliases = new Map(items.map(proxy => [proxy.name, uniqueName(`${prefix}${proxy.name}`, names)]))

    for (const proxy of items) {
      const name = aliases.get(proxy.name)!
      const dialer = proxy['dialer-proxy']
      proxies.push({
        ...proxy,
        name,
        ...(dialer ? { 'dialer-proxy': aliases.get(dialer) ?? dialer } : {}),
      })

      if (usNodePattern.test(proxy.name)) {
        usNodes.push(name)
      }
    }

    return aliases
  }

  const localAliases = addProxies([...options.proxies, ...(options.mixin.proxies ?? [])], '')
  const localNames = [...localAliases.values()]

  for (const source of options.sources) {
    const aliases = addProxies(source.proxies, `[${source.name}] `)

    if (aliases.size) {
      sourceGroups.push({
        name: uniqueName(`📦 ${source.name}`, names),
        type: 'select',
        proxies: [...aliases.values()],
      })
    }
  }

  if (!proxies.length) {
    throw new ClashConfigError('No proxy nodes are available')
  }

  const groups: ClashProxyGroup[] = [
    {
      name: ALL_PROXY_GROUP,
      type: 'select',
      proxies: [
        ...sourceGroups.map(group => group.name),
        ...(localNames.length ? [MANUAL_PROXY_GROUP] : []),
        ...proxies.map(proxy => proxy.name),
        'DIRECT',
      ],
    },
    {
      name: US_PROXY_GROUP,
      type: 'select',
      proxies: usNodes.length ? usNodes : [ALL_PROXY_GROUP],
    },
    ...sourceGroups,
    ...(localNames.length
      ? [{ name: MANUAL_PROXY_GROUP, type: 'select', proxies: localNames }]
      : []),
    ...customGroups.map(group => ({
      ...group,
      ...(group.proxies ? { proxies: group.proxies.map(name => localAliases.get(name) ?? name) } : {}),
    })),
  ]

  const targets = new Set([...builtinTargets, ...proxies.map(proxy => proxy.name), ...groups.map(group => group.name)])

  for (const group of groups) {
    if (group.proxies?.some(name => !targets.has(name) || name === group.name)) {
      throw new ClashConfigError('A mixin proxy group has an unresolved or self-referencing target')
    }
  }

  return {
    'mixed-port': 7890,
    'mode': 'rule',
    ...options.mixin,
    proxies,
    'proxy-groups': groups,
    rules: options.mixin.rules ?? [`MATCH,${ALL_PROXY_GROUP}`],
  }
}
