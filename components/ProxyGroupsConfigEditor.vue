<script setup lang="ts">
import type { EditableProxyGroup } from '~/composables/useApi'
import {
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-vue'
import {
  editableRegionOptions,
  filterFromEditableRegions,
  inferEditableRegions,
  useEditableConfigEditor,
} from '~/composables/useEditableConfigEditor'

const { t } = useI18n()
const {
  proxyGroups,
  providerNames,
  loading,
  saving,
  dirty,
  error,
  success,
  load,
  save,
  addProxyGroup,
  updateProxyGroup,
  removeProxyGroup,
} = useEditableConfigEditor()

const selectedRegions = computed(() =>
  Object.fromEntries(
    proxyGroups.value.map((group) => [
      group.name,
      inferEditableRegions(group.filter),
    ]),
  ),
)

function selectedOptionValues(event: Event) {
  const select = event.target as HTMLSelectElement
  return Array.from(select.selectedOptions).map((option) => option.value)
}

function patchGroup(index: number, patch: Partial<EditableProxyGroup>) {
  updateProxyGroup(index, { ...proxyGroups.value[index]!, ...patch })
}

function updateGroupProviders(index: number, event: Event) {
  patchGroup(index, { use: selectedOptionValues(event) })
}

function updateGroupRegions(index: number, event: Event) {
  patchGroup(index, {
    filter: filterFromEditableRegions(selectedOptionValues(event)),
  })
}

onMounted(() => load())
</script>

<template>
  <section
    class="animate-fade-slide-in mb-3 overflow-hidden rounded-xl border border-base-content/8 bg-base-200/60 backdrop-blur-xs"
  >
    <header
      class="flex flex-wrap items-center gap-2 border-b border-base-content/8 bg-base-300/20 px-3 py-2.5"
    >
      <div class="min-w-0 flex-1">
        <h2 class="text-sm font-semibold">{{ t('autoProxyGroups') }}</h2>
      </div>
      <Button
        class="btn-outline btn-sm"
        :icon="IconRefresh"
        :loading="loading"
        :title="t('reloadConfig')"
        @click="load(true)"
      />
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

    <div v-if="loading" class="flex h-24 items-center justify-center">
      <span class="loading loading-ring text-primary" />
    </div>

    <div v-else class="grid max-h-96 gap-3 overflow-y-auto p-3 lg:grid-cols-2">
      <div
        v-for="(group, index) in proxyGroups"
        :key="`${group.name}-${index}`"
        class="rounded-xl border border-base-content/8 bg-base-100/50 p-3"
      >
        <div class="mb-3 grid grid-cols-[minmax(0,1fr)_2rem] gap-2">
          <label class="min-w-0">
            <span class="mb-1 block text-xs opacity-60">{{
              t('proxyGroupName')
            }}</span>
            <input
              :value="group.name"
              class="input-bordered input input-sm w-full font-mono text-xs"
              spellcheck="false"
              @input="
                patchGroup(index, {
                  name: ($event.target as HTMLInputElement).value,
                })
              "
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

        <div class="grid gap-3 md:grid-cols-2">
          <label class="block">
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

          <label class="block">
            <span class="mb-1 block text-xs opacity-60">{{
              t('proxyGroupRegions')
            }}</span>
            <select
              multiple
              class="select-bordered select min-h-24 w-full text-xs"
              :value="selectedRegions[group.name] || []"
              @change="updateGroupRegions(index, $event)"
            >
              <option
                v-for="region in editableRegionOptions"
                :key="region.code"
                :value="region.code"
              >
                {{ region.label }}
              </option>
            </select>
          </label>
        </div>

        <label class="mt-3 block">
          <span class="mb-1 block text-xs opacity-60">{{
            t('proxyGroupFilter')
          }}</span>
          <input
            :value="group.filter"
            class="input-bordered input input-sm w-full font-mono text-xs"
            spellcheck="false"
            @input="
              patchGroup(index, {
                filter: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </label>

        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label class="min-w-0">
            <span class="mb-1 block text-xs opacity-60">{{
              t('proxyGroupTestUrl')
            }}</span>
            <input
              :value="group.url"
              type="url"
              class="input-bordered input input-sm w-full font-mono text-xs"
              spellcheck="false"
              @input="
                patchGroup(index, {
                  url: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label class="min-w-0">
            <span class="mb-1 block text-xs opacity-60">{{
              t('proxyGroupInterval')
            }}</span>
            <input
              :value="group.interval"
              type="number"
              min="1"
              class="input-bordered input input-sm w-full"
              @input="
                patchGroup(index, {
                  interval:
                    Number(($event.target as HTMLInputElement).value) || 300,
                })
              "
            />
          </label>
          <label class="min-w-0">
            <span class="mb-1 block text-xs opacity-60">{{
              t('proxyGroupTolerance')
            }}</span>
            <input
              :value="group.tolerance"
              type="number"
              min="0"
              class="input-bordered input input-sm w-full"
              @input="
                patchGroup(index, {
                  tolerance:
                    Number(($event.target as HTMLInputElement).value) || 0,
                })
              "
            />
          </label>
        </div>
      </div>
    </div>

    <footer
      v-if="error || success"
      class="border-t border-base-content/8 px-3 py-2 text-sm"
      :class="error ? 'text-error' : 'text-success'"
    >
      {{ error || success }}
    </footer>
  </section>
</template>
