<script setup lang="ts">
import type { EditableConfig } from '~/composables/useApi'
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
const rules = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const baseline = ref('')

const providerEntries = computed(() => Object.entries(providers.value))
const dirty = computed(
  () =>
    baseline.value !==
    JSON.stringify({
      'proxy-providers': providers.value,
      rules: rules.value,
    }),
)

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
    rules.value = [...config.rules]
    baseline.value = JSON.stringify(config)
  } catch (value) {
    error.value = await errorMessage(value)
  } finally {
    loading.value = false
  }
}

function addRule() {
  rules.value.unshift('')
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
    rules: rules.value.map((rule) => rule.trim()),
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
    rules.value = [...config.rules]
    baseline.value = JSON.stringify(config)
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
      class="grid gap-6 p-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(28rem,1.2fr)]"
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
