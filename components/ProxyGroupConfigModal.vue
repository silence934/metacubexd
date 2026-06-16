<script setup lang="ts">
import type { EditableProxyGroup } from '~/composables/useApi'
import type { Proxy as ProxyType } from '~/types'
import {
  IconDeviceFloppy,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-vue'
import {
  createEditableProxyGroup,
  editableRegionOptions,
  filterFromEditableRegions,
  inferEditableRegions,
  useEditableConfigEditor,
} from '~/composables/useEditableConfigEditor'

const { t } = useI18n()
const proxiesStore = useProxiesStore()

const modal = ref<{ open: () => void; close: () => void }>()
const mode = ref<'create' | 'edit'>('create')
const originalName = ref('')
const draft = ref<EditableProxyGroup>(createEditableProxyGroup(''))
const targetQuery = ref('')

const {
  proxyGroups,
  providerNames,
  loading,
  saving,
  error,
  success,
  load,
  save,
  upsertProxyGroup,
  removeProxyGroup,
} = useEditableConfigEditor()

const title = computed(() =>
  mode.value === 'edit' ? t('editProxyGroup') : t('addProxyGroup'),
)

const canDelete = computed(
  () =>
    mode.value === 'edit' &&
    proxyGroups.value.some((group) => group.name === originalName.value),
)

const proxyTargetOptions = computed(() => {
  const names = new Set(['DIRECT', 'REJECT'])
  for (const group of proxyGroups.value) {
    if (group.name && group.name !== draft.value.name) names.add(group.name)
  }
  for (const proxy of proxiesStore.proxies) {
    if (proxy.name && proxy.name !== draft.value.name) names.add(proxy.name)
  }
  for (const name of Object.keys(proxiesStore.proxyNodeMap)) {
    if (name && name !== draft.value.name) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
})

const visibleProxyTargetOptions = computed(() => {
  const query = targetQuery.value.trim().toLowerCase()
  const options = query
    ? proxyTargetOptions.value.filter((name) =>
        name.toLowerCase().includes(query),
      )
    : proxyTargetOptions.value
  return options.slice(0, 48)
})

const selectedRegions = computed({
  get: () => inferEditableRegions(draft.value.filter),
  set: (value) => {
    draft.value.filter = filterFromEditableRegions(value)
  },
})

const proxiesText = computed({
  get: () => draft.value.proxies.join('\n'),
  set: (value) => {
    draft.value.proxies = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
  },
})

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function toggleProvider(provider: string) {
  draft.value.use = toggleArrayValue(draft.value.use, provider)
}

function toggleRegion(region: string) {
  selectedRegions.value = toggleArrayValue(selectedRegions.value, region)
}

function addProxyTarget(name: string) {
  if (!draft.value.proxies.includes(name)) {
    draft.value.proxies = [...draft.value.proxies, name]
  }
}

function nextGroupName() {
  const usedNames = new Set(proxyGroups.value.map((group) => group.name))
  let index = proxyGroups.value.length + 1
  let name = `GROUP-${index}`
  while (usedNames.has(name)) {
    index += 1
    name = `GROUP-${index}`
  }
  return name
}

function cloneGroup(group: EditableProxyGroup) {
  return {
    ...createEditableProxyGroup(group.name),
    ...group,
    proxies: [...(group.proxies ?? [])],
    use: [...(group.use ?? [])],
  }
}

async function openForCreate() {
  await load(true)
  mode.value = 'create'
  originalName.value = ''
  targetQuery.value = ''
  draft.value = {
    ...createEditableProxyGroup(nextGroupName(), providerNames.value),
    type: 'select',
    use: [],
  }
  modal.value?.open()
}

async function openForEdit(proxyGroup: ProxyType) {
  await load(true)
  mode.value = 'edit'
  originalName.value = proxyGroup.name
  targetQuery.value = ''
  const editable = proxyGroups.value.find(
    (group) => group.name === proxyGroup.name,
  )
  draft.value = cloneGroup(
    editable ?? {
      ...createEditableProxyGroup(proxyGroup.name),
      type: proxyGroup.type || 'select',
      proxies: [...(proxyGroup.all ?? [])],
      url: proxyGroup.testUrl || '',
      interval: 300,
      tolerance: 0,
    },
  )
  modal.value?.open()
}

async function saveDraft() {
  upsertProxyGroup(draft.value, originalName.value)
  await save()
  if (!error.value) {
    modal.value?.close()
    await proxiesStore.fetchProxies()
  }
}

async function deleteDraft() {
  const index = proxyGroups.value.findIndex(
    (group) => group.name === originalName.value,
  )
  if (index < 0) return
  removeProxyGroup(index)
  await save()
  if (!error.value) {
    modal.value?.close()
    await proxiesStore.fetchProxies()
  }
}

defineExpose({ openForCreate, openForEdit })
</script>

<template>
  <Modal ref="modal" :title="title">
    <template #icon>
      <IconPlus v-if="mode === 'create'" :size="22" />
      <IconEdit v-else :size="22" />
    </template>

    <div v-if="loading" class="flex h-40 items-center justify-center">
      <span class="loading loading-ring text-primary" />
    </div>

    <div v-else class="flex flex-col gap-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="min-w-0">
          <span class="mb-1 block text-xs opacity-60">
            {{ t('proxyGroupName') }}
          </span>
          <input
            v-model.trim="draft.name"
            class="config-control input-bordered input w-full font-mono text-sm"
            spellcheck="false"
          />
        </label>

        <label class="min-w-0">
          <span class="mb-1 block text-xs opacity-60">
            {{ t('proxyGroupType') }}
          </span>
          <select
            v-model="draft.type"
            class="config-control select-bordered select w-full"
          >
            <option value="select">select</option>
            <option value="url-test">url-test</option>
            <option value="fallback">fallback</option>
            <option value="load-balance">load-balance</option>
          </select>
        </label>
      </div>

      <label class="block">
        <span class="mb-1 block text-xs opacity-60">
          {{ t('proxyGroupProxyTargets') }}
        </span>
        <textarea
          v-model="proxiesText"
          class="config-control textarea-bordered textarea min-h-28 w-full font-mono text-xs"
          spellcheck="false"
          :placeholder="t('proxyGroupProxyTargetsPlaceholder')"
        />
        <details
          class="mt-2 rounded-lg border border-base-content/8 bg-base-200/35"
        >
          <summary
            class="cursor-pointer px-3 py-2 text-xs font-medium text-base-content/70 select-none"
          >
            {{ t('proxyGroupQuickAdd') }}
          </summary>
          <div class="border-t border-base-content/8 p-3">
            <div
              class="mb-2 flex h-9 items-center gap-2 rounded-lg border border-base-content/10 bg-base-100 px-2 focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15"
            >
              <IconSearch :size="15" class="shrink-0 opacity-50" />
              <input
                v-model="targetQuery"
                class="w-full bg-transparent text-sm outline-none"
                type="search"
                :placeholder="t('search')"
              />
            </div>
            <div class="max-h-36 overflow-y-auto">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="name in visibleProxyTargetOptions"
                  :key="name"
                  class="rounded-md border px-2 py-1 text-xs transition-colors"
                  :class="
                    draft.proxies.includes(name)
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-base-content/10 bg-base-100/70 text-base-content/70 hover:border-primary/35 hover:text-primary'
                  "
                  type="button"
                  @click="addProxyTarget(name)"
                >
                  {{ name }}
                </button>
              </div>
            </div>
          </div>
        </details>
      </label>

      <div class="grid gap-3 md:grid-cols-2">
        <section class="block">
          <span class="mb-1 block text-xs opacity-60">
            {{ t('proxyGroupProviders') }}
          </span>
          <div
            class="selection-panel grid max-h-36 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-base-content/10 bg-base-100/60 p-2 sm:grid-cols-2"
          >
            <label
              v-for="provider in providerNames"
              :key="provider"
              class="selection-chip"
              :class="
                draft.use.includes(provider)
                  ? 'is-selected border-primary/45 bg-primary/15 text-primary'
                  : 'border-base-content/10 bg-base-200/45 text-base-content/75'
              "
            >
              <input
                class="checkbox checkbox-xs checkbox-primary"
                type="checkbox"
                :checked="draft.use.includes(provider)"
                @change="toggleProvider(provider)"
              />
              {{ provider }}
            </label>
          </div>
        </section>

        <section class="block">
          <span class="mb-1 block text-xs opacity-60">
            {{ t('proxyGroupRegions') }}
          </span>
          <div
            class="selection-panel grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-base-content/10 bg-base-100/60 p-2 sm:grid-cols-3"
          >
            <label
              v-for="region in editableRegionOptions"
              :key="region.code"
              class="selection-chip"
              :class="
                selectedRegions.includes(region.code)
                  ? 'is-selected border-primary/45 bg-primary/15 text-primary'
                  : 'border-base-content/10 bg-base-200/45 text-base-content/75'
              "
            >
              <input
                class="checkbox checkbox-xs checkbox-primary"
                type="checkbox"
                :checked="selectedRegions.includes(region.code)"
                @change="toggleRegion(region.code)"
              />
              {{ region.label }}
            </label>
          </div>
        </section>
      </div>

      <label class="block">
        <span class="mb-1 block text-xs opacity-60">
          {{ t('proxyGroupFilter') }}
        </span>
        <input
          v-model="draft.filter"
          class="config-control input-bordered input w-full font-mono text-xs"
          spellcheck="false"
        />
      </label>

      <div
        v-if="draft.type !== 'select'"
        class="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <label class="min-w-0 sm:col-span-3">
          <span class="mb-1 block text-xs opacity-60">
            {{ t('proxyGroupTestUrl') }}
          </span>
          <input
            v-model.trim="draft.url"
            type="url"
            class="config-control input-bordered input w-full font-mono text-xs"
            spellcheck="false"
          />
        </label>

        <label class="min-w-0">
          <span class="mb-1 block text-xs opacity-60">
            {{ t('proxyGroupInterval') }}
          </span>
          <input
            v-model.number="draft.interval"
            type="number"
            min="1"
            class="config-control input-bordered input w-full"
          />
        </label>

        <label v-if="draft.type === 'url-test'" class="min-w-0">
          <span class="mb-1 block text-xs opacity-60">
            {{ t('proxyGroupTolerance') }}
          </span>
          <input
            v-model.number="draft.tolerance"
            type="number"
            min="0"
            class="config-control input-bordered input w-full"
          />
        </label>

        <label v-if="draft.type === 'load-balance'" class="min-w-0">
          <span class="mb-1 block text-xs opacity-60">
            {{ t('proxyGroupStrategy') }}
          </span>
          <select
            v-model="draft.strategy"
            class="config-control select-bordered select w-full"
          >
            <option value="consistent-hashing">consistent-hashing</option>
            <option value="round-robin">round-robin</option>
            <option value="sticky-sessions">sticky-sessions</option>
          </select>
        </label>
      </div>

      <div
        v-if="error || success"
        class="rounded-lg border px-3 py-2 text-sm"
        :class="
          error
            ? 'border-error/20 bg-error/10 text-error'
            : 'border-success/20 bg-success/10 text-success'
        "
      >
        {{ error || success }}
      </div>
    </div>

    <template #actions>
      <Button
        v-if="canDelete"
        class="mr-auto btn-outline btn-error"
        :disabled="saving"
        @click="deleteDraft"
      >
        <IconTrash :size="16" />
        {{ t('deleteProxyGroup') }}
      </Button>
      <Button class="btn-primary" :loading="saving" @click="saveDraft">
        <IconDeviceFloppy :size="16" />
        {{ t('saveAndReload') }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.config-control {
  border-color: color-mix(
    in oklch,
    var(--color-base-content) 14%,
    transparent
  ) !important;
  background-color: color-mix(
    in oklch,
    var(--color-base-100) 82%,
    transparent
  ) !important;
  outline: none !important;
  box-shadow: none !important;
  transition:
    border-color var(--dur-fast) var(--ease-soft),
    box-shadow var(--dur-fast) var(--ease-soft),
    background-color var(--dur-fast) var(--ease-soft);
}

.config-control:focus,
.config-control:focus-visible,
.config-control:focus-within {
  border-color: color-mix(
    in oklch,
    var(--color-primary) 55%,
    transparent
  ) !important;
  outline: none !important;
  box-shadow: 0 0 0 2px
    color-mix(in oklch, var(--color-primary) 16%, transparent) !important;
}

.selection-panel {
  box-shadow: inset 0 1px 0
    color-mix(in oklch, var(--color-base-content) 4%, transparent);
}

.selection-chip {
  display: flex;
  min-height: 2rem;
  cursor: pointer;
  align-items: center;
  gap: 0.5rem;
  border-width: 1px;
  border-radius: 0.5rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1rem;
  transition:
    border-color var(--dur-fast) var(--ease-soft),
    background-color var(--dur-fast) var(--ease-soft),
    color var(--dur-fast) var(--ease-soft);
}

.selection-chip:hover {
  border-color: color-mix(in oklch, var(--color-primary) 35%, transparent);
  color: var(--color-primary);
}
</style>
