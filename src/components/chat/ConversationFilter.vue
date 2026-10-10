<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

export type ConversationFilterValue = '全部' | '未讀' | '交易中' | '系統'

const FILTER_LABEL_KEY: Record<
  ConversationFilterValue,
  'filterAll' | 'filterUnread' | 'filterTrading' | 'filterSystem'
> = {
  全部: 'filterAll',
  未讀: 'filterUnread',
  交易中: 'filterTrading',
  系統: 'filterSystem',
}
const FILTERS: ConversationFilterValue[] = ['全部', '未讀', '交易中', '系統']

defineProps<{ modelValue: ConversationFilterValue }>()
defineEmits<{ 'update:modelValue': [ConversationFilterValue] }>()
const { t } = useI18n()
</script>

<template>
  <div class="chip-row">
    <button
      v-for="f in FILTERS"
      :key="f"
      class="chip"
      :class="{ active: modelValue === f }"
      @click="$emit('update:modelValue', f)"
    >
      {{ t('messagesList', FILTER_LABEL_KEY[f]) }}
    </button>
  </div>
</template>

<style scoped>
.chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.chip {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 700;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-text-secondary);
  border: 1px solid transparent;
}

.chip.active {
  background: var(--color-primary);
  color: #fff;
}
</style>
