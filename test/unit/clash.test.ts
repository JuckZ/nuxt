import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  parseClashDocument,
  parseSourcesConfig,
  type ClashProxy,
} from '../../server/clash/config'
import {
  ALL_PROXY_GROUP,
  MANUAL_PROXY_GROUP,
  mergeClashSources,
  US_PROXY_GROUP,
  validateSourceProxies,
} from '../../server/clash/merge'

function node(name: string, extra: Record<string, unknown> = {}): ClashProxy {
  return { name, type: 'ss', server: 'example.com', port: 443, cipher: 'aes-128-gcm', password: 'test', ...extra }
}

describe('Clash private sources configuration', () => {
  test('the shipped example parses and preserves protocol-specific fields', () => {
    const source = readFileSync(new URL('../../clash.config.example.yaml', import.meta.url), 'utf8')
    expect(parseSourcesConfig(source)).toHaveProperty('private')
    const parsed = parseClashDocument('proxies:\n  - name: test\n    type: trojan\n    password: secret\n    sni: example.com\n')
    expect(parsed.proxies?.[0]).toMatchObject({ password: 'secret', sni: 'example.com' })
  })

  test('rejects non-HTTP sources and duplicate source names without exposing URLs', () => {
    const source = 'default:\n  subscriptions:\n    - name: A\n      url: file:///secret-token\n'
    expect(() => parseSourcesConfig(source)).toThrow('default.subscriptions.0.url')
    expect(() => parseSourcesConfig(source)).not.toThrow('secret-token')
    expect(() => parseSourcesConfig('default:\n  subscriptions:\n    - {name: A, url: "https://a.example"}\n    - {name: A, url: "https://b.example"}\n')).toThrow('name')
  })

  test('does not expose YAML parser excerpts containing credentials', () => {
    for (const parse of [parseSourcesConfig, parseClashDocument]) {
      let error: unknown

      try {
        parse('password: [super-secret-token')
      }
      catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(Error)
      expect(String(error)).not.toContain('super-secret-token')
    }
  })

  test('requires unique standalone node names', () => {
    expect(() => parseSourcesConfig('private:\n  proxies:\n    - {name: same, type: ss}\n    - {name: same, type: ss}\n')).toThrow('private.proxies.1.name')
  })
})

describe('Clash multi-source merging', () => {
  test('merges subscriptions and manual nodes with unique names and correct dialer references', () => {
    const result = mergeClashSources({
      sources: [
        { name: 'A', proxies: [node('美国 01'), node('日本', { 'dialer-proxy': '美国 01' })] },
        { name: 'B', proxies: [node('美国 01')] },
      ],
      proxies: [node('[A] 美国 01')],
      mixin: { rules: [`MATCH,${ALL_PROXY_GROUP}`] },
    })

    const names = result.proxies!.map(proxy => proxy.name)
    expect(new Set(names).size).toBe(4)
    expect(result.proxies?.find(proxy => proxy.name === '[A] 日本')?.['dialer-proxy']).toBe('[A] 美国 01 (2)')
    const targets = new Set(['DIRECT', ...names, ...result['proxy-groups']!.map(group => group.name)])

    for (const group of result['proxy-groups']!) {
      expect(group.proxies?.length).toBeGreaterThan(0)
      expect(group.proxies?.every(name => targets.has(name))).toBe(true)
    }
  })

  test('appends mixin proxies and groups without replacing downloaded nodes', () => {
    const result = mergeClashSources({
      sources: [{ name: 'A', proxies: [node('美国')] }],
      proxies: [node('自建')],
      mixin: {
        'proxies': [node('附加')],
        'proxy-groups': [{ name: '自定义', type: 'select', proxies: ['附加'] }],
        'rules': ['MATCH,自定义'],
      },
    })

    expect(result.proxies).toHaveLength(3)
    expect(result['proxy-groups']?.find(group => group.name === MANUAL_PROXY_GROUP)?.proxies).toEqual(['自建', '附加'])
    expect(result['proxy-groups']?.find(group => group.name === '自定义')?.proxies).toEqual(['附加'])
    expect(result.rules).toEqual(['MATCH,自定义'])
  })

  test('supports standalone-only configuration and an empty US region safely', () => {
    const result = mergeClashSources({ sources: [], proxies: [node('日本')], mixin: {} })
    expect(result.proxies).toHaveLength(1)
    expect(result['proxy-groups']?.find(group => group.name === US_PROXY_GROUP)?.proxies).toEqual([ALL_PROXY_GROUP])
    expect(result.rules).toEqual([`MATCH,${ALL_PROXY_GROUP}`])
  })

  test('classifies US nodes by node name rather than subscription name', () => {
    const result = mergeClashSources({
      sources: [{ name: '美国订阅', proxies: [node('香港'), node('US 02'), node('🇺🇸 03')] }],
      proxies: [],
      mixin: {},
    })

    expect(result['proxy-groups']?.find(group => group.name === US_PROXY_GROUP)?.proxies).toEqual([
      '[美国订阅] US 02', '[美国订阅] 🇺🇸 03',
    ])
  })

  test('rejects duplicate nodes and unresolved or circular dialer references', () => {
    expect(() => validateSourceProxies([node('same'), node('same')])).toThrow('unique')
    expect(() => validateSourceProxies([node('A', { 'dialer-proxy': 'missing' })])).toThrow('unresolved')
    expect(() => validateSourceProxies([
      node('A', { 'dialer-proxy': 'B' }), node('B', { 'dialer-proxy': 'A' }),
    ])).toThrow('circular')
  })

  test('rejects an empty export or a mixin group referencing missing nodes', () => {
    expect(() => mergeClashSources({ sources: [], proxies: [], mixin: {} })).toThrow('No proxy')
    expect(() => mergeClashSources({
      sources: [],
      proxies: [node('local')],
      mixin: { 'proxy-groups': [{ name: 'broken', type: 'select', proxies: ['missing'] }] },
    })).toThrow('unresolved')
  })
})
