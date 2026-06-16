<script setup lang="ts">
import { IconDeviceFloppy, IconLink } from '@tabler/icons-vue'
import { useEditableConfigEditor } from '~/composables/useEditableConfigEditor'

const props = defineProps<{
  providerName: string
}>()

const { t } = useI18n()
const { providers, loading, saving, dirty, error, success, load, save } =
  useEditableConfigEditor()

const providerUrl = computed({
  get: () => providers.value[props.providerName] ?? '',
  set: (value) => {
    providers.value = { ...providers.value, [props.providerName]: value }
  },
})

onMounted(() => load())
</script>

<template>
  <div
    v-if="providerName in providers"
    class="provider-url-editor mt-2 flex min-w-0 flex-col gap-2 rounded-lg border border-base-content/8 bg-base-content/5 p-2.5"
    @click.stop
  >
    <div class="flex items-center justify-between gap-2">
      <div
        class="flex min-w-0 items-center gap-1.5 text-xs text-base-content/55"
      >
        <IconLink :size="14" class="shrink-0 text-primary/70" />
        <span class="truncate">{{ t('proxyProviderUrls') }}</span>
      </div>
      <span
        v-if="dirty"
        class="rounded-md bg-warning/12 px-1.5 py-0.5 text-[0.65rem] font-medium text-warning"
      >
        {{ t('modified') }}
      </span>
    </div>
    <div class="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
      <input
        v-model="providerUrl"
        type="url"
        class="provider-url-input input-bordered input input-sm min-w-0 font-mono text-xs"
        spellcheck="false"
        :disabled="loading"
      />
      <Button
        class="btn-square border border-primary/30 bg-primary/15 text-primary transition-colors btn-sm hover:bg-primary hover:text-primary-content"
        :disabled="!dirty || loading"
        :loading="saving"
        :title="t('saveAndReload')"
        @click.stop="save"
      >
        <IconDeviceFloppy :size="15" />
      </Button>
    </div>
    <p
      v-if="error || success"
      class="truncate text-xs"
      :class="error ? 'text-error' : 'text-success'"
    >
      {{ error || success }}
    </p>
  </div>
</template>

<style scoped>
.provider-url-editor {
  box-shadow: inset 0 1px 0
    color-mix(in oklch, var(--color-base-content) 4%, transparent);
}

.provider-url-input {
  border-color: color-mix(
    in oklch,
    var(--color-base-content) 14%,
    transparent
  ) !important;
  background-color: color-mix(
    in oklch,
    var(--color-base-100) 86%,
    transparent
  ) !important;
  outline: none !important;
  box-shadow: none !important;
  transition:
    border-color var(--dur-fast) var(--ease-soft),
    box-shadow var(--dur-fast) var(--ease-soft),
    background-color var(--dur-fast) var(--ease-soft);
}

.provider-url-input:focus,
.provider-url-input:focus-visible {
  border-color: color-mix(
    in oklch,
    var(--color-primary) 55%,
    transparent
  ) !important;
  outline: none !important;
  box-shadow: 0 0 0 2px
    color-mix(in oklch, var(--color-primary) 16%, transparent) !important;
}
</style>
