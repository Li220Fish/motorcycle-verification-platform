<script setup lang="ts">
export type ConversationFilterValue = '全部' | '未讀' | '交易中' | '系統'

const FILTERS: ConversationFilterValue[] = ['全部', '未讀', '交易中', '系統']

defineProps<{ modelValue: ConversationFilterValue }>()
defineEmits<{ 'update:modelValue': [ConversationFilterValue] }>()
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
      {{ f }}
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
