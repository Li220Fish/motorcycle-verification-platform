<script setup lang="ts">
import ComparisonItem from './ComparisonItem.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import type { ComparisonItem as ComparisonItemData } from '@/services/verification/comparison.service'
import type { TransactionDecision } from '@/types/verification'

defineProps<{
  comparisonItems: ComparisonItemData[]
  attentionItems: string[]
  unsureItems: string[]
  incompleteCount: number
  decision?: TransactionDecision
}>()

const emit = defineEmits<{ decide: [TransactionDecision] }>()

const decisions: Array<{ value: TransactionDecision; label: string }> = [
  { value: 'continue_considering', label: '繼續考慮' },
  { value: 'need_third_party', label: '需要第三方檢查' },
  { value: 'not_buying', label: '暫不購買' },
]
</script>

<template>
  <div class="comparison-summary">
    <h2>Seller vs Buyer 差異比對</h2>
    <div class="comparison-list">
      <ComparisonItem v-for="item in comparisonItems" :key="item.buyerItemId" :item="item" />
    </div>

    <h2>風險摘要</h2>
    <div class="risk-block">
      <div class="risk-row">
        <span>需要注意</span>
        <span>{{ attentionItems.length }}</span>
      </div>
      <ul v-if="attentionItems.length > 0">
        <li v-for="label in attentionItems" :key="label">{{ label }}</li>
      </ul>
      <div class="risk-row">
        <span>需要確認</span>
        <span>{{ unsureItems.length }}</span>
      </div>
      <ul v-if="unsureItems.length > 0">
        <li v-for="label in unsureItems" :key="label">{{ label }}</li>
      </ul>
      <div class="risk-row">
        <span>未完成</span>
        <span>{{ incompleteCount }}</span>
      </div>
    </div>

    <h2>交易決策</h2>
    <div class="decision-buttons">
      <PrimaryButton
        v-for="option in decisions"
        :key="option.value"
        :variant="decision === option.value ? 'primary' : 'secondary'"
        block
        @click="emit('decide', option.value)"
      >
        {{ option.label }}
      </PrimaryButton>
    </div>
  </div>
</template>

<style scoped>
.comparison-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.comparison-summary h2 {
  font-size: 16px;
  font-weight: 700;
}

.comparison-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.risk-block {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.risk-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 700;
}

.risk-block ul {
  margin: 0 0 var(--space-sm);
  padding-left: 1.2em;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.decision-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
