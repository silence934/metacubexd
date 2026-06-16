<script setup lang="ts">
import type { EditableConfig, EditableProxyGroup } from '~/composables/useApi'
import {
  IconArrowDown,
  IconArrowUp,
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-vue'
import { HTTPError } from 'ky'
import {
  fetchEditableConfigAPI,
  updateEditableConfigAPI,
} from '~/composables/useApi'

const { t } = useI18n()

const providers = ref<Record<string, string>>({})
const proxyGroups = ref<EditableProxyGroup[]>([])
const rules = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const baseline = ref('')

const providerEntries = computed(() => Object.entries(providers.value))
const providerNames = computed(() => Object.keys(providers.value))
const dirty = computed(
  () =>
    baseline.value !==
    JSON.stringify({
      'proxy-providers': providers.value,
      'proxy-groups': proxyGroups.value,
      rules: rules.value,
    }),
)

const regionOptions = [
  {
    code: 'HK',
    label: '香港',
    aliases: ['香港', 'Hong Kong', 'HK'],
  },
  {
    code: 'TW',
    label: '台湾',
    aliases: ['台湾', 'Taiwan', 'TW'],
  },
  {
    code: 'JP',
    label: '日本',
    aliases: ['日本', 'Japan', 'JP'],
  },
  {
    code: 'SG',
    label: '新加坡',
    aliases: ['新加坡', 'Singapore', 'SG'],
  },
  {
    code: 'US',
    label: '美国',
    aliases: ['美国', 'USA', 'United States', 'US'],
  },
  {
    code: 'KR',
    label: '韩国',
    aliases: ['韩国', 'Korea', 'South Korea', 'KR'],
  },
  {
    code: 'GB',
    label: '英国',
    aliases: ['英国', 'United Kingdom', 'UK', 'GB'],
  },
  {
    code: 'DE',
    label: '德国',
    aliases: ['德国', 'Germany', 'DE'],
  },
]

const selectedRegions = ref<Record<string, string[]>>({})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function filterFromRegions(regionCodes: string[]) {
  const aliases = regionCodes.flatMap((code) => {
    const option = regionOptions.find((item) => item.code === code)
    return option?.aliases ?? []
  })
  return aliases.length ? `(?i)(${aliases.map(escapeRegExp).join('|')})` : ''
}

function inferRegions(filter: string) {
  return regionOptions
    .filter((option) => option.aliases.some((alias) => filter.includes(alias)))
    .map((option) => option.code)
}

function syncRegionSelections() {
  selectedRegions.value = Object.fromEntries(
    proxyGroups.value.map((group) => [group.name, inferRegions(group.filter)]),
  )
}

function selectedOptionValues(event: Event) {
  const select = event.target as HTMLSelectElement
  return Array.from(select.selectedOptions).map((option) => option.value)
}

function updateGroupProviders(index: number, event: Event) {
  proxyGroups.value[index]!.use = selectedOptionValues(event)
}

function updateGroupRegions(group: EditableProxyGroup, event: Event) {
  const values = selectedOptionValues(event)
  selectedRegions.value[group.name] = values
  group.filter = filterFromRegions(values)
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

async function load() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const config = await fetchEditableConfigAPI()
    providers.value = { ...config['proxy-providers'] }
    proxyGroups.value = config['proxy-groups'].map((group) => ({ ...group }))
    rules.value = [...config.rules]
    baseline.value = JSON.stringify(config)
    syncRegionSelections()
  } catch (value) {
    error.value = await errorMessage(value)
  } finally {
    loading.value = false
  }
}

function addRule() {
  rules.value.unshift('')
}

function addProxyGroup() {
  const usedNames = new Set(proxyGroups.value.map((group) => group.name))
  let index = proxyGroups.value.length + 1
  let name = `AUTO-${index}`
  while (usedNames.has(name)) {
    index += 1
    name = `AUTO-${index}`
  }
  const regions = ['HK', 'TW', 'JP', 'SG', 'US']
  proxyGroups.value.push({
    name,
    use: [...providerNames.value],
    filter: filterFromRegions(regions),
    url: 'http://www.gstatic.com/generate_204',
    interval: 300,
    tolerance: 50,
  })
  selectedRegions.value[name] = regions
}

function removeProxyGroup(index: number) {
  const [removed] = proxyGroups.value.splice(index, 1)
  if (removed) delete selectedRegions.value[removed.name]
}

function removeRule(index: number) {
  rules.value.splice(index, 1)
}

function moveRule(index: number, offset: number) {
  const destination = index + offset
  if (destination < 0 || destination >= rules.value.length) return
  const [rule] = rules.value.splice(index, 1)
  rules.value.splice(destination, 0, rule!)
}

async function save() {
  const config: EditableConfig = {
    'proxy-providers': { ...providers.value },
    'proxy-groups': proxyGroups.value.map((group) => ({
      ...group,
      name: group.name.trim(),
      use: group.use.filter(Boolean),
      filter: group.filter.trim(),
      url: group.url.trim(),
      interval: Number(group.interval) || 300,
      tolerance: Number(group.tolerance) || 0,
    })),
    rules: rules.value.map((rule) => rule.trim()),
  }
  if (config['proxy-groups'].some((group) => !group.name)) {
    error.value = t('editableConfigEmptyProxyGroup')
    return
  }
  if (config['proxy-groups'].some((group) => group.use.length === 0)) {
    error.value = t('editableConfigProxyGroupNoProviders')
    return
  }
  if (config.rules.some((rule) => !rule)) {
    error.value = t('editableConfigEmptyRule')
    return
  }

  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const result = await updateEditableConfigAPI(config)
    providers.value = { ...config['proxy-providers'] }
    proxyGroups.value = config['proxy-groups'].map((group) => ({ ...group }))
    rules.value = [...config.rules]
    baseline.value = JSON.stringify(config)
    syncRegionSelections()
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

onMounted(load)
</script>

<template>
  <section
    class="overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/50 shadow-sm"
  >
    <header
      class="flex flex-wrap items-center gap-2 border-b border-base-content/10 bg-base-300/30 px-4 py-3"
    >
      <div class="min-w-0 basis-full sm:flex-1 sm:basis-auto">
        <h2 class="text-sm font-semibold">{{ t('editableConfig') }}</h2>
        <p class="mt-0.5 text-xs opacity-55">
          {{ t('editableConfigDesc') }}
        </p>
      </div>
      <Button
        class="btn-outline btn-sm"
        :icon="IconRefresh"
        :loading="loading"
        :aria-label="t('reloadConfig')"
        @click="load"
      />
      <Button class="btn-outline btn-sm" @click="addRule">
        <IconPlus :size="16" />
        {{ t('addRule') }}
      </Button>
      <Button class="btn-outline btn-sm" @click="addProxyGroup">
        <IconPlus :size="16" />
        {{ t('addProxyGroup') }}
      </Button>
      <Button
        class="btn-sm btn-primary"
        :loading="saving"
        :disabled="!dirty || loading"
        @click="save"
      >
        <IconDeviceFloppy :size="16" />
        {{ t('saveAndReload') }}
      </Button>
    </header>

    <div v-if="loading" class="flex h-40 items-center justify-center">
      <span class="loading loading-lg loading-ring text-primary" />
    </div>

    <div
      v-else
      class="grid gap-6 p-4 xl:grid-cols-[minmax(16rem,0.75fr)_minmax(22rem,1fr)_minmax(26rem,1.15fr)]"
    >
      <div class="min-w-0">
        <h3
          class="mb-3 text-xs font-semibold tracking-wide uppercase opacity-60"
        >
          {{ t('proxyProviderUrls') }}
        </h3>
        <div v-if="providerEntries.length" class="flex flex-col gap-3">
          <label
            v-for="[name] in providerEntries"
            :key="name"
            class="flex min-w-0 flex-col gap-1.5"
          >
            <span class="truncate text-sm font-medium">{{ name }}</span>
            <input
              v-model="providers[name]"
              type="url"
              class="input-bordered input w-full font-mono text-xs"
              spellcheck="false"
            />
          </label>
        </div>
        <p v-else class="text-sm opacity-50">
          {{ t('noEditableProxyProviders') }}
        </p>
      </div>

      <div class="min-w-0">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="text-xs font-semibold tracking-wide uppercase opacity-60">
            {{ t('autoProxyGroups') }}
          </h3>
          <span class="badge badge-ghost badge-sm">{{
            proxyGroups.length
          }}</span>
        </div>
        <div class="flex max-h-[34rem] flex-col gap-3 overflow-y-auto pr-1">
          <div
            v-for="(group, index) in proxyGroups"
            :key="`${group.name}-${index}`"
            class="rounded-xl border border-base-content/10 bg-base-100/50 p-3"
          >
            <div class="mb-3 grid grid-cols-[minmax(0,1fr)_2rem] gap-2">
              <label class="min-w-0">
                <span class="mb-1 block text-xs opacity-60">{{
                  t('proxyGroupName')
                }}</span>
                <input
                  v-model="group.name"
                  class="input-bordered input input-sm w-full font-mono text-xs"
                  spellcheck="false"
                />
              </label>
              <button
                class="btn mt-5 btn-square text-error btn-ghost btn-sm"
                :aria-label="t('deleteProxyGroup')"
                @click="removeProxyGroup(index)"
              >
                <IconTrash :size="16" />
              </button>
            </div>

            <label class="mb-3 block">
              <span class="mb-1 block text-xs opacity-60">{{
                t('proxyGroupProviders')
              }}</span>
              <select
                multiple
                class="select-bordered select min-h-24 w-full text-xs"
                :value="group.use"
                @change="updateGroupProviders(index, $event)"
              >
                <option
                  v-for="provider in providerNames"
                  :key="provider"
                  :value="provider"
                >
                  {{ provider }}
                </option>
              </select>
            </label>

            <label class="mb-3 block">
              <span class="mb-1 block text-xs opacity-60">{{
                t('proxyGroupRegions')
              }}</span>
              <select
                multiple
                class="select-bordered select min-h-32 w-full text-xs"
                :value="selectedRegions[group.name] || []"
                @change="updateGroupRegions(group, $event)"
              >
                <option
                  v-for="region in regionOptions"
                  :key="region.code"
                  :value="region.code"
                >
                  {{ region.label }}
                </option>
              </select>
            </label>

            <label class="mb-3 block">
              <span class="mb-1 block text-xs opacity-60">{{
                t('proxyGroupFilter')
              }}</span>
              <input
                v-model="group.filter"
                class="input-bordered input input-sm w-full font-mono text-xs"
                spellcheck="false"
              />
            </label>

            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label class="min-w-0">
                <span class="mb-1 block text-xs opacity-60">{{
                  t('proxyGroupTestUrl')
                }}</span>
                <input
                  v-model="group.url"
                  type="url"
                  class="input-bordered input input-sm w-full font-mono text-xs"
                  spellcheck="false"
                />
              </label>
              <label class="min-w-0">
                <span class="mb-1 block text-xs opacity-60">{{
                  t('proxyGroupInterval')
                }}</span>
                <input
                  v-model.number="group.interval"
                  type="number"
                  min="1"
                  class="input-bordered input input-sm w-full"
                />
              </label>
              <label class="min-w-0">
                <span class="mb-1 block text-xs opacity-60">{{
                  t('proxyGroupTolerance')
                }}</span>
                <input
                  v-model.number="group.tolerance"
                  type="number"
                  min="0"
                  class="input-bordered input input-sm w-full"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="min-w-0">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="text-xs font-semibold tracking-wide uppercase opacity-60">
            {{ t('rules') }}
          </h3>
          <span class="badge badge-ghost badge-sm">{{ rules.length }}</span>
        </div>
        <div class="flex max-h-[34rem] flex-col gap-2 overflow-y-auto pr-1">
          <div
            v-for="(_, index) in rules"
            :key="index"
            class="grid grid-cols-[minmax(0,1fr)_2rem_2rem_2rem] gap-1.5"
          >
            <input
              v-model="rules[index]"
              type="text"
              class="input-bordered input min-w-0 font-mono text-xs"
              :placeholder="t('rulePlaceholder')"
              spellcheck="false"
            />
            <button
              class="btn btn-square btn-ghost btn-sm"
              :aria-label="t('moveUp')"
              :disabled="index === 0"
              @click="moveRule(index, -1)"
            >
              <IconArrowUp :size="16" />
            </button>
            <button
              class="btn btn-square btn-ghost btn-sm"
              :aria-label="t('moveDown')"
              :disabled="index === rules.length - 1"
              @click="moveRule(index, 1)"
            >
              <IconArrowDown :size="16" />
            </button>
            <button
              class="btn btn-square text-error btn-ghost btn-sm"
              :aria-label="t('deleteRule')"
              @click="removeRule(index)"
            >
              <IconTrash :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <footer
      v-if="error || success"
      class="border-t border-base-content/10 px-4 py-3 text-sm"
      :class="error ? 'text-error' : 'text-success'"
    >
      {{ error || success }}
    </footer>
  </section>
</template>
