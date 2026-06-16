<script setup lang="ts">
import type { Rule } from '~/types'
import {
  IconDeviceFloppy,
  IconEdit,
  IconPlus,
  IconTrash,
} from '@tabler/icons-vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useEditableConfigEditor } from '~/composables/useEditableConfigEditor'
import { queryKeys } from '~/composables/useQueries'

const { t } = useI18n()
const queryClient = useQueryClient()

const modal = ref<{ open: () => void; close: () => void }>()
const mode = ref<'create' | 'edit' | 'delete'>('create')
const editingIndex = ref(-1)
const draft = ref('')

const {
  rules,
  loading,
  saving,
  error,
  success,
  load,
  save,
  addRule,
  updateRule,
  removeRule,
} = useEditableConfigEditor()

const title = computed(() =>
  mode.value === 'delete'
    ? t('deleteRule')
    : mode.value === 'edit'
      ? t('editRule')
      : t('addRule'),
)

const canDelete = computed(
  () =>
    (mode.value === 'edit' || mode.value === 'delete') &&
    editingIndex.value >= 0,
)

async function openForCreate() {
  await load(true)
  mode.value = 'create'
  editingIndex.value = -1
  draft.value = ''
  modal.value?.open()
}

async function openForEdit(rule: Rule) {
  await load(true)
  mode.value = 'edit'
  editingIndex.value = rule.index
  draft.value =
    rules.value[rule.index] ??
    [rule.type, rule.payload, rule.proxy].filter(Boolean).join(',')
  modal.value?.open()
}

async function openForDelete(rule: Rule) {
  await load(true)
  mode.value = 'delete'
  editingIndex.value = rule.index
  draft.value =
    rules.value[rule.index] ??
    [rule.type, rule.payload, rule.proxy].filter(Boolean).join(',')
  modal.value?.open()
}

async function refreshRules() {
  await queryClient.invalidateQueries({ queryKey: queryKeys.rules })
}

async function saveDraft() {
  if (mode.value === 'delete') {
    await deleteDraft()
    return
  }

  if (mode.value === 'create') {
    addRule()
    updateRule(0, draft.value)
  } else if (editingIndex.value >= 0) {
    updateRule(editingIndex.value, draft.value)
  }

  await save()
  if (!error.value) {
    modal.value?.close()
    await refreshRules()
  }
}

async function deleteDraft() {
  if (editingIndex.value < 0) return
  removeRule(editingIndex.value)
  await save()
  if (!error.value) {
    modal.value?.close()
    await refreshRules()
  }
}

defineExpose({ openForCreate, openForEdit, openForDelete })
</script>

<template>
  <Modal ref="modal" :title="title">
    <template #icon>
      <IconPlus v-if="mode === 'create'" :size="22" />
      <IconTrash v-else-if="mode === 'delete'" :size="22" />
      <IconEdit v-else :size="22" />
    </template>

    <div v-if="loading" class="flex h-32 items-center justify-center">
      <span class="loading loading-ring text-primary" />
    </div>

    <div v-else class="flex flex-col gap-4">
      <label class="block">
        <span class="mb-1 block text-xs opacity-60">
          {{ t('rule') }}
        </span>
        <textarea
          v-model="draft"
          class="rule-control textarea-bordered textarea min-h-28 w-full font-mono text-xs"
          spellcheck="false"
          :readonly="mode === 'delete'"
          :placeholder="t('rulePlaceholder')"
        />
      </label>

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
        v-if="mode === 'edit' && canDelete"
        class="mr-auto btn-outline btn-error"
        :disabled="saving"
        @click="deleteDraft"
      >
        <IconTrash :size="16" />
        {{ t('deleteRule') }}
      </Button>
      <Button
        v-if="mode === 'delete'"
        class="btn-error"
        :loading="saving"
        @click="deleteDraft"
      >
        <IconTrash :size="16" />
        {{ t('deleteRule') }}
      </Button>
      <Button v-else class="btn-primary" :loading="saving" @click="saveDraft">
        <IconDeviceFloppy :size="16" />
        {{ t('saveAndReload') }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.rule-control {
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

.rule-control:focus,
.rule-control:focus-visible {
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
