<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import PriceRangeSlider from './PriceRangeSlider.vue'
import {
  DEFAULT_MARKETPLACE_FILTERS,
  PLATE_COLOR_OPTIONS,
  PRICE_FILTER_MAX,
  PRICE_FILTER_MIN,
  PRICE_FILTER_STEP,
  type MarketplaceFilters,
  type MarketplaceSortOption,
  type PowerTypeFilter,
} from './marketplace-filters'

const props = defineProps<{
  open: boolean
  modelValue: MarketplaceFilters
  /** Distinct values pulled from the currently-loaded listings
   * (MarketplaceView.vue) — not a fixed enum, since 車型類別 is admin
   * free-text (see admin/sections/ModelsSection.vue). */
  bodyTypeOptions: string[]
  brandOptions: string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [MarketplaceFilters]; close: [] }>()
const { t } = useI18n()

const SORT_OPTIONS = computed<{ value: MarketplaceSortOption; label: string }[]>(() => [
  { value: 'price-desc', label: t('marketplace', 'sortPriceDesc') },
  { value: 'price-asc', label: t('marketplace', 'sortPriceAsc') },
])

const POWER_TYPE_OPTIONS = computed<{ value: PowerTypeFilter; label: string }[]>(() => [
  { value: 'all', label: t('marketplace', 'powerAll') },
  { value: 'gasoline', label: t('marketplace', 'powerGasoline') },
  { value: 'electric', label: t('marketplace', 'powerElectric') },
])

const PLATE_LABEL_KEY: Record<
  (typeof PLATE_COLOR_OPTIONS)[number]['value'],
  'plateGreen' | 'plateWhite' | 'plateYellow' | 'plateRed'
> = {
  green: 'plateGreen',
  white: 'plateWhite',
  yellow: 'plateYellow',
  red: 'plateRed',
}

function update(changes: Partial<MarketplaceFilters>): void {
  emit('update:modelValue', { ...props.modelValue, ...changes })
}

function selectBodyType(value: string): void {
  update({ bodyType: props.modelValue.bodyType === value ? null : value })
}

function selectBrand(value: string): void {
  update({ brand: props.modelValue.brand === value ? null : value })
}

function selectPlateColor(value: MarketplaceFilters['plateColor']): void {
  update({ plateColor: props.modelValue.plateColor === value ? null : value })
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
          <h3>{{ t('marketplace', 'filterTitle') }}</h3>
        </div>

        <div class="filter-group">
          <p class="group-title">{{ t('marketplace', 'priceRange') }}</p>
          <PriceRangeSlider
            :model-value="modelValue.priceRange"
            :min="PRICE_FILTER_MIN"
            :max="PRICE_FILTER_MAX"
            :step="PRICE_FILTER_STEP"
            @update:model-value="update({ priceRange: $event })"
          />
        </div>

        <div class="filter-group">
          <p class="group-title">{{ t('marketplace', 'displacement') }}</p>
          <div class="chip-row">
            <button
              v-for="option in PLATE_COLOR_OPTIONS"
              :key="option.value"
              class="chip"
              :class="{ active: modelValue.plateColor === option.value }"
              @click="selectPlateColor(option.value)"
            >
              {{ t('marketplace', PLATE_LABEL_KEY[option.value])
              }}<span class="chip-sub">{{ option.range }}</span>
            </button>
          </div>
        </div>

        <div class="filter-group">
          <p class="group-title">{{ t('marketplace', 'powerType') }}</p>
          <div class="chip-row">
            <button
              v-for="option in POWER_TYPE_OPTIONS"
              :key="option.value"
              class="chip"
              :class="{ active: modelValue.powerType === option.value }"
              @click="update({ powerType: option.value })"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="bodyTypeOptions.length > 0" class="filter-group">
          <p class="group-title">{{ t('marketplace', 'bodyType') }}</p>
          <div class="chip-row">
            <button
              v-for="option in bodyTypeOptions"
              :key="option"
              class="chip"
              :class="{ active: modelValue.bodyType === option }"
              @click="selectBodyType(option)"
            >
              {{ option }}
            </button>
          </div>
        </div>

        <div v-if="brandOptions.length > 0" class="filter-group">
          <p class="group-title">{{ t('marketplace', 'brand') }}</p>
          <div class="chip-row">
            <button
              v-for="option in brandOptions"
              :key="option"
              class="chip"
              :class="{ active: modelValue.brand === option }"
              @click="selectBrand(option)"
            >
              {{ option }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <p class="group-title">{{ t('marketplace', 'sortBy') }}</p>
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

        <button class="reset-link" @click="handleReset">
          {{ t('marketplace', 'resetFilters') }}
        </button>
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
  padding: 14px 18px calc(18px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)));
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

.chip-sub {
  margin-left: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.chip.active .chip-sub {
  color: inherit;
  opacity: 0.75;
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
