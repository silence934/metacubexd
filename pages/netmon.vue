<script setup lang="ts">
import { IconExternalLink, IconRefresh } from '@tabler/icons-vue'

const { t } = useI18n()
useHead({ title: computed(() => t('networkMonitor')) })

const frameKey = ref(0)
const loaded = ref(false)
const failed = ref(false)

const netmonURL = computed(() => {
  if (!import.meta.client) return ''
  return `${window.location.protocol}//${window.location.hostname}:8088/?embed=1`
})

function refreshFrame() {
  loaded.value = false
  failed.value = false
  frameKey.value += 1
}

function openStandalone() {
  if (import.meta.client)
    window.open(
      netmonURL.value.replace('/?embed=1', '/'),
      '_blank',
      'noopener,noreferrer',
    )
}

onMounted(() => {
  window.setTimeout(() => {
    if (!loaded.value) failed.value = true
  }, 8000)
})
</script>

<template>
  <section
    class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-base-content/10 bg-base-200"
  >
    <header
      class="flex shrink-0 items-center gap-3 border-b border-base-content/10 px-3 py-2 sm:px-4"
    >
      <div class="min-w-0 flex-1">
        <h1
          class="truncate text-sm font-semibold text-base-content sm:text-base"
        >
          {{ t('networkMonitor') }}
        </h1>
        <p class="hidden text-xs text-base-content/50 sm:block">
          {{ t('networkMonitorDescription') }}
        </p>
      </div>
      <span
        class="hidden items-center gap-1.5 rounded-full px-2 py-1 text-xs sm:flex"
        :class="
          loaded
            ? 'bg-success/10 text-success'
            : failed
              ? 'bg-error/10 text-error'
              : 'bg-warning/10 text-warning'
        "
      >
        <i class="h-1.5 w-1.5 rounded-full bg-current" />
        {{
          loaded
            ? t('networkMonitorLive')
            : failed
              ? t('networkMonitorFailed')
              : t('networkMonitorConnecting')
        }}
      </span>
      <button
        class="btn btn-square btn-ghost btn-sm"
        :title="t('networkMonitorRefresh')"
        :aria-label="t('networkMonitorRefresh')"
        @click="refreshFrame"
      >
        <IconRefresh class="h-4 w-4" />
      </button>
      <button
        class="btn btn-square btn-ghost btn-sm"
        :title="t('networkMonitorOpen')"
        :aria-label="t('networkMonitorOpen')"
        @click="openStandalone"
      >
        <IconExternalLink class="h-4 w-4" />
      </button>
    </header>

    <div class="relative min-h-0 flex-1 bg-[#06100d]">
      <div
        v-if="!loaded"
        class="absolute inset-0 z-10 grid place-items-center bg-base-200"
      >
        <div
          class="flex flex-col items-center gap-3 text-sm text-base-content/60"
        >
          <span class="loading loading-lg loading-ring text-primary" />
          <span>{{
            failed ? t('networkMonitorUnavailable') : t('networkMonitorLoading')
          }}</span>
          <button
            v-if="failed"
            class="btn btn-sm btn-primary"
            @click="refreshFrame"
          >
            {{ t('networkMonitorRetry') }}
          </button>
        </div>
      </div>
      <iframe
        :key="frameKey"
        :src="netmonURL"
        class="h-full w-full border-0"
        title="家庭网络监控"
        @load="loaded = true"
      />
    </div>
  </section>
</template>
