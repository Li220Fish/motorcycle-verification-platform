<script setup lang="ts">
import { X } from 'lucide-vue-next'

import PriceRangeSlider from './PriceRangeSlider.vue'
import {
  DEFAULT_MARKETPLACE_FILTERS,
  PRICE_FILTER_MAX,
  PRICE_FILTER_MIN,
  PRICE_FILTER_STEP,
  type MarketplaceFilters,
  type MarketplaceSortOption,
  type SellerTypeFilter,
} from './marketplace-filters'

const props = defineProps<{ open: boolean; modelValue: MarketplaceFilters }>()
const emit = defineEmits<{ 'update:modelValue': [MarketplaceFilters]; close: [] }>()

const SELLER_TYPE_OPTIONS: { value: SellerTypeFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'individual', label: '個人賣家' },
  { value: 'dealer', label: '認證車商' },
]

const SORT_OPTIONS: { value: MarketplaceSortOption; label: string }[] = [
  { value: 'default', label: '預設排序' },
  { value: 'price-asc', label: '價格由低到高' },
  { value: 'price-desc', label: '價格由高到低' },
  { value: 'mileage-asc', label: '里程由低到高' },
  { value: 'score-desc', label: '驗證分數高到低' },
]

function update(changes: Partial<MarketplaceFilters>): void {
  emit('update:modelValue', { ...props.modelValue, ...changes })
}

function handleReset(): void {
  emit('update:modelValue', { ...DEFAULT_MARKETPLACE_FILTERS })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="$emit('close')">
      <div class="sheet">
        <div class="handle" />
        <div class="sheet-head">
          <h3>篩選與排序</h3>
          <button class="close-btn" aria-label="關閉" @click="$emit('close')">
            <X :size="16" />
          </button>
        </div>

        <div class="filter-group">
          <p class="group-title">價格範圍</p>
          <PriceRangeSlider
            :model-value="modelValue.priceRange"
            :min="PRICE_FILTER_MIN"
            :max="PRICE_FILTER_MAX"
            :step="PRICE_FILTER_STEP"
            @update:model-value="update({ priceRange: $event })"
          />
        </div>

        <div class="filter-group">
          <p class="group-title">賣家類型</p>
          <div class="chip-row">
            <button
              v-for="option in SELLER_TYPE_OPTIONS"
              :key="option.value"
              class="chip"
              :class="{ active: modelValue.sellerType === option.value }"
              @click="update({ sellerType: option.value })"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <div class="toggle-row">
            <p class="group-title no-margin">只顯示可過戶</p>
            <button
              class="switch"
              :class="{ on: modelValue.transferableOnly }"
              role="switch"
              :aria-checked="modelValue.transferableOnly"
              @click="update({ transferableOnly: !modelValue.transferableOnly })"
            >
              <span class="knob" />
            </button>
          </div>
        </div>

        <div class="filter-group">
          <p class="group-title">排序方式</p>
          <div class="option-list">
            <button
              v-for="option in SORT_OPTIONS"
              :key="option.value"
              class="option-row"
              :class="{ active: modelValue.sortBy === option.value }"
              @click="update({ sortBy: option.value })"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <button class="reset-link" @click="handleReset">重設篩選條件</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: flex-end;
  z-index: 40;
}

.sheet {
  width: 100%;
  max-height: 82vh;
  overflow-y: auto;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  padding: 14px 18px calc(18px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.handle {
  width: 36px;
  height: 4px;
  border-radius: 99px;
  background: var(--color-border);
  margin: 0 auto 4px;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-head h3 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.close-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: none;
  background: var(--color-background);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.group-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.group-title.no-margin {
  margin: 0;
}

.chip-row {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.chip {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 13.5px;
  font-weight: 600;
}

.chip.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  color: var(--color-primary);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.switch {
  flex-shrink: 0;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  border: none;
  background: var(--color-border);
  position: relative;
  transition: background 0.15s ease;
}

.switch.on {
  background: var(--color-primary);
}

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  transition: transform 0.15s ease;
}

.switch.on .knob {
  transform: translateX(18px);
}

.option-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.option-row {
  padding: 12px var(--space-md);
  border: none;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
}

.option-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.option-row.active {
  color: var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  font-weight: 700;
}

.reset-link {
  align-self: center;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  padding: 4px;
}
</style>
