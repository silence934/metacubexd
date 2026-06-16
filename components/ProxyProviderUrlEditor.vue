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
    class="mt-2 flex min-w-0 flex-col gap-1.5 rounded-lg border border-base-content/8 bg-base-content/5 p-2"
    @click.stop
  >
    <div class="flex items-center gap-1.5 text-xs text-base-content/50">
      <IconLink :size="14" />
      <span>{{ t('proxyProviderUrls') }}</span>
    </div>
    <div class="grid grid-cols-[minmax(0,1fr)_2rem] gap-1.5">
      <input
        v-model="providerUrl"
        type="url"
        class="input-bordered input input-sm min-w-0 font-mono text-xs"
        spellcheck="false"
        :disabled="loading"
      />
      <Button
        class="btn-square btn-sm btn-primary"
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
