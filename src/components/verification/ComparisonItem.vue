<script setup lang="ts">
import { STANDARD_INSPECTION_OPTIONS } from '@/data/verification'
import type { ComparisonItem } from '@/services/verification/comparison.service'

defineProps<{ item: ComparisonItem }>()

function resultLabel(value?: string): string {
  if (!value) return '未檢查'
  return STANDARD_INSPECTION_OPTIONS.find((option) => option.value === value)?.label ?? value
}
</script>

<template>
  <div class="comparison-item" :class="item.match">
    <p class="label">{{ item.label }}</p>
    <div class="values">
      <div class="value-col">
        <span class="value-label">Seller</span>
        <span class="value">{{ resultLabel(item.sellerResult) }}</span>
      </div>
      <div class="value-col">
        <span class="value-label">Buyer</span>
        <span class="value">{{ resultLabel(item.buyerResult) }}</span>
      </div>
      <span class="match-badge">
        {{
          item.match === 'match' ? '✓ 一致' : item.match === 'different' ? '⚠ 不一致' : '— 尚未複驗'
        }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.comparison-item {
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.comparison-item.different {
  border-color: var(--color-warning);
  background: var(--color-warning-bg);
}

.label {
  font-size: 14px;
  font-weight: 700;
}

.values {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.value-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.value-label {
  font-size: 11px;
  color: var(--color-text-disabled);
}

.value {
  font-size: 13px;
  font-weight: 600;
}

.match-badge {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
}

.comparison-item.match .match-badge {
  color: var(--color-success);
}

.comparison-item.different .match-badge {
  color: var(--color-warning);
}

.comparison-item.not_checked .match-badge {
  color: var(--color-text-disabled);
}
</style>
