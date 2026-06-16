<script setup lang="ts">
import {
  IconArrowDown,
  IconArrowUp,
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-vue'
import { useEditableConfigEditor } from '~/composables/useEditableConfigEditor'

const { t } = useI18n()
const {
  rules,
  loading,
  saving,
  dirty,
  error,
  success,
  load,
  save,
  addRule,
  updateRule,
  removeRule,
  moveRule,
} = useEditableConfigEditor()

const isOpen = useLocalStorage('rules-config-editor-open', true)

onMounted(() => load())
</script>

<template>
  <section
    class="animate-fade-slide-in overflow-hidden rounded-xl border border-base-content/8 bg-base-200/60 backdrop-blur-xs"
  >
    <header
      class="flex flex-wrap items-center gap-2 border-b border-base-content/8 bg-base-300/20 px-3 py-2.5"
    >
      <button
        class="flex min-w-0 flex-1 items-center gap-2 text-left"
        @click="isOpen = !isOpen"
      >
        <span class="text-sm font-semibold">{{ t('rules') }}</span>
        <span class="badge badge-ghost badge-sm">{{ rules.length }}</span>
      </button>
      <Button
        class="btn-outline btn-sm"
        :icon="IconRefresh"
        :loading="loading"
        :title="t('reloadConfig')"
        @click="load(true)"
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

    <div v-if="isOpen">
      <div v-if="loading" class="flex h-24 items-center justify-center">
        <span class="loading loading-ring text-primary" />
      </div>

      <div v-else class="flex max-h-96 flex-col gap-2 overflow-y-auto p-3">
        <div
          v-for="(rule, index) in rules"
          :key="index"
          class="grid grid-cols-[minmax(0,1fr)_2rem_2rem_2rem] gap-1.5"
        >
          <input
            :value="rule"
            type="text"
            class="input-bordered input min-w-0 font-mono text-xs"
            :placeholder="t('rulePlaceholder')"
            spellcheck="false"
            @input="
              updateRule(index, ($event.target as HTMLInputElement).value)
            "
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

    <footer
      v-if="error || success"
      class="border-t border-base-content/8 px-3 py-2 text-sm"
      :class="error ? 'text-error' : 'text-success'"
    >
      {{ error || success }}
    </footer>
  </section>
</template>
