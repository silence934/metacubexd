import type { EditableConfig, EditableProxyGroup } from '~/composables/useApi'
import { HTTPError } from 'ky'
import {
  fetchEditableConfigAPI,
  updateEditableConfigAPI,
} from '~/composables/useApi'

const DEFAULT_TEST_URL = 'http://www.gstatic.com/generate_204'

export const editableRegionOptions = [
  { code: 'HK', label: '香港', aliases: ['香港', 'Hong Kong', '🇭🇰'] },
  { code: 'TW', label: '台湾', aliases: ['台湾', '臺灣', 'Taiwan', '🇹🇼'] },
  { code: 'JP', label: '日本', aliases: ['日本', 'Japan', '🇯🇵'] },
  { code: 'SG', label: '新加坡', aliases: ['新加坡', 'Singapore', '🇸🇬'] },
  {
    code: 'US',
    label: '美国',
    aliases: ['美国', '美國', 'United States', 'USA', '🇺🇸'],
  },
  {
    code: 'KR',
    label: '韩国',
    aliases: ['韩国', '韓國', 'Korea', 'South Korea', '🇰🇷'],
  },
  {
    code: 'GB',
    label: '英国',
    aliases: ['英国', '英國', 'United Kingdom', 'Britain', '🇬🇧'],
  },
  { code: 'DE', label: '德国', aliases: ['德国', '德國', 'Germany', '🇩🇪'] },
]

function emptyConfig(): EditableConfig {
  return {
    'proxy-providers': {},
    'proxy-groups': [],
    rules: [],
  }
}

export function createEditableProxyGroup(
  name: string,
  providerNames: string[] = [],
): EditableProxyGroup {
  return {
    name,
    type: 'select',
    proxies: [],
    use: [...providerNames],
    filter: '',
    url: DEFAULT_TEST_URL,
    interval: 300,
    tolerance: 50,
    strategy: 'consistent-hashing',
  }
}

function normalizeProxyGroup(group: Partial<EditableProxyGroup>) {
  return {
    ...createEditableProxyGroup(group.name || ''),
    ...group,
    type: group.type || 'select',
    proxies: [...(group.proxies ?? [])],
    use: [...(group.use ?? [])],
    filter: group.filter ?? '',
    url: group.url || DEFAULT_TEST_URL,
    interval: Number(group.interval) || 300,
    tolerance: Number(group.tolerance) || 0,
    strategy: group.strategy || 'consistent-hashing',
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeConfig(config: EditableConfig): EditableConfig {
  return {
    'proxy-providers': { ...config['proxy-providers'] },
    'proxy-groups': config['proxy-groups'].map((group) =>
      normalizeProxyGroup(group),
    ),
    rules: [...config.rules],
  }
}

async function errorMessage(value: unknown) {
  if (value instanceof HTTPError) {
    const payload = (await value.response
      .clone()
      .json()
      .catch(() => null)) as { message?: string } | null
    if (payload?.message) return payload.message
  }
  if (value instanceof Error) return value.message
  return String(value)
}

export function filterFromEditableRegions(regionCodes: string[]) {
  const aliases = regionCodes.flatMap((code) => {
    const option = editableRegionOptions.find((item) => item.code === code)
    return option?.aliases ?? []
  })
  return aliases.length ? `(?i)(${aliases.map(escapeRegExp).join('|')})` : ''
}

export function inferEditableRegions(filter: string) {
  return editableRegionOptions
    .filter((option) => option.aliases.some((alias) => filter.includes(alias)))
    .map((option) => option.code)
}

export function useEditableConfigEditor() {
  const { t } = useI18n()
  const config = useState<EditableConfig>('editable-config', emptyConfig)
  const baseline = useState('editable-config-baseline', () => '')
  const loading = useState('editable-config-loading', () => false)
  const saving = useState('editable-config-saving', () => false)
  const error = useState('editable-config-error', () => '')
  const success = useState('editable-config-success', () => '')
  const loaded = useState('editable-config-loaded', () => false)

  const providers = computed({
    get: () => config.value['proxy-providers'],
    set: (value) => {
      config.value = { ...config.value, 'proxy-providers': value }
    },
  })
  const proxyGroups = computed({
    get: () => config.value['proxy-groups'],
    set: (value) => {
      config.value = { ...config.value, 'proxy-groups': value }
    },
  })
  const rules = computed({
    get: () => config.value.rules,
    set: (value) => {
      config.value = { ...config.value, rules: value }
    },
  })
  const providerNames = computed(() => Object.keys(providers.value))
  const dirty = computed(() => baseline.value !== JSON.stringify(config.value))

  async function load(force = false) {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    error.value = ''
    success.value = ''
    try {
      const next = normalizeConfig(await fetchEditableConfigAPI())
      config.value = next
      baseline.value = JSON.stringify(next)
      loaded.value = true
    } catch (value) {
      error.value = await errorMessage(value)
    } finally {
      loading.value = false
    }
  }

  function addProxyGroup() {
    const usedNames = new Set(proxyGroups.value.map((group) => group.name))
    let index = proxyGroups.value.length + 1
    let name = `AUTO-${index}`
    while (usedNames.has(name)) {
      index += 1
      name = `AUTO-${index}`
    }
    proxyGroups.value = [
      ...proxyGroups.value,
      {
        ...createEditableProxyGroup(name, providerNames.value),
        name,
        type: 'url-test',
        use: [...providerNames.value],
        filter: filterFromEditableRegions(['HK', 'TW', 'JP', 'SG', 'US']),
      },
    ]
  }

  function updateProxyGroup(index: number, group: EditableProxyGroup) {
    proxyGroups.value = proxyGroups.value.map((item, itemIndex) =>
      itemIndex === index ? group : item,
    )
  }

  function removeProxyGroup(index: number) {
    proxyGroups.value = proxyGroups.value.filter(
      (_, itemIndex) => itemIndex !== index,
    )
  }

  function upsertProxyGroup(group: EditableProxyGroup, originalName = '') {
    const name = originalName || group.name
    const index = proxyGroups.value.findIndex((item) => item.name === name)
    const normalized = normalizeProxyGroup(group)
    if (index >= 0) {
      updateProxyGroup(index, normalized)
      return
    }
    proxyGroups.value = [...proxyGroups.value, normalized]
  }

  function addRule() {
    rules.value = ['', ...rules.value]
  }

  function updateRule(index: number, rule: string) {
    rules.value = rules.value.map((item, itemIndex) =>
      itemIndex === index ? rule : item,
    )
  }

  function removeRule(index: number) {
    rules.value = rules.value.filter((_, itemIndex) => itemIndex !== index)
  }

  function moveRule(index: number, offset: number) {
    const destination = index + offset
    if (destination < 0 || destination >= rules.value.length) return
    const next = [...rules.value]
    const [rule] = next.splice(index, 1)
    next.splice(destination, 0, rule!)
    rules.value = next
  }

  function payload(): EditableConfig {
    return {
      'proxy-providers': { ...providers.value },
      'proxy-groups': proxyGroups.value.map((group) => ({
        ...group,
        name: group.name.trim(),
        type: group.type || 'select',
        proxies: group.proxies.map((item) => item.trim()).filter(Boolean),
        use: group.use.map((item) => item.trim()).filter(Boolean),
        filter: group.filter.trim(),
        url: group.url.trim(),
        interval: Number(group.interval) || 300,
        tolerance: Number(group.tolerance) || 0,
        strategy: group.strategy.trim(),
      })),
      rules: rules.value.map((rule) => rule.trim()),
    }
  }

  async function save() {
    const next = payload()
    if (next['proxy-groups'].some((group) => !group.name)) {
      error.value = t('editableConfigEmptyProxyGroup')
      return
    }
    if (
      next['proxy-groups'].some(
        (group) => group.use.length === 0 && group.proxies.length === 0,
      )
    ) {
      error.value = t('editableConfigProxyGroupNoProviders')
      return
    }
    if (next.rules.some((rule) => !rule)) {
      error.value = t('editableConfigEmptyRule')
      return
    }

    saving.value = true
    error.value = ''
    success.value = ''
    try {
      const result = await updateEditableConfigAPI(next)
      config.value = normalizeConfig(next)
      baseline.value = JSON.stringify(config.value)
      success.value = t('editableConfigSaved', {
        backup: result.backup,
        version: result.version,
      })
    } catch (value) {
      error.value = await errorMessage(value)
    } finally {
      saving.value = false
    }
  }

  return {
    config,
    providers,
    proxyGroups,
    rules,
    providerNames,
    loading,
    saving,
    error,
    success,
    dirty,
    load,
    save,
    addProxyGroup,
    updateProxyGroup,
    removeProxyGroup,
    upsertProxyGroup,
    addRule,
    updateRule,
    removeRule,
    moveRule,
  }
}
