<script setup lang="ts">
import { computed } from 'vue'

// Two overlapping native <input type="range"> elements — the standard
// lightweight way to build a draggable dual-handle range slider without a
// UI library dependency. Each only captures pointer events on its own thumb
// (::-webkit-slider-thumb / ::-moz-range-thumb), so both stay independently
// draggable even though the invisible full-width tracks overlap.
const props = withDefaults(
  defineProps<{
    modelValue: [number, number]
    min: number
    max: number
    step?: number
  }>(),
  { step: 1000 },
)
const emit = defineEmits<{ 'update:modelValue': [[number, number]] }>()

function handleMinInput(event: Event): void {
  const raw = Number((event.target as HTMLInputElement).value)
  const clamped = Math.min(raw, props.modelValue[1] - props.step)
  emit('update:modelValue', [clamped, props.modelValue[1]])
}

function handleMaxInput(event: Event): void {
  const raw = Number((event.target as HTMLInputElement).value)
  const clamped = Math.max(raw, props.modelValue[0] + props.step)
  emit('update:modelValue', [props.modelValue[0], clamped])
}

const fillStyle = computed(() => {
  const span = props.max - props.min || 1
  const leftPct = ((props.modelValue[0] - props.min) / span) * 100
  const rightPct = ((props.modelValue[1] - props.min) / span) * 100
  return { left: `${leftPct}%`, width: `${rightPct - leftPct}%` }
})

function formatPrice(value: number): string {
  return value >= props.max ? `$${value.toLocaleString()}+` : `$${value.toLocaleString()}`
}
</script>

<template>
  <div class="price-range">
    <div class="track-wrap">
      <div class="track" />
      <div class="track-fill" :style="fillStyle" />
      <input
        type="range"
        class="thumb thumb-min"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue[0]"
        aria-label="最低價格"
        @input="handleMinInput"
      />
      <input
        type="range"
        class="thumb thumb-max"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue[1]"
        aria-label="最高價格"
        @input="handleMaxInput"
      />
    </div>
    <div class="price-labels">
      <span>{{ formatPrice(modelValue[0]) }}</span>
      <span>{{ formatPrice(modelValue[1]) }}</span>
    </div>
  </div>
</template>

<style scoped>
.price-range {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.track-wrap {
  position: relative;
  height: 28px;
}

.track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 4px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: var(--color-border);
}

.track-fill {
  position: absolute;
  top: 50%;
  height: 4px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: var(--color-primary);
}

.thumb {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 28px;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  pointer-events: none;
}

.thumb-min {
  z-index: 2;
}

.thumb-max {
  z-index: 3;
}

.thumb::-webkit-slider-runnable-track {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
}

.thumb::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  pointer-events: auto;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid var(--color-primary);
  box-shadow: var(--shadow-card);
  cursor: pointer;
}

.thumb::-moz-range-track {
  background: transparent;
}

.thumb::-moz-range-thumb {
  pointer-events: auto;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid var(--color-primary);
  box-shadow: var(--shadow-card);
  cursor: pointer;
}

.price-labels {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}
</style>
