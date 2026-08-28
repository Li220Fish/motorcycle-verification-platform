<script setup lang="ts">
import { computed } from 'vue'

import type { VoltageSample } from '@/services/probe/probe.types'

const props = withDefaults(
  defineProps<{
    samples: VoltageSample[]
    windowMs?: number
  }>(),
  { windowMs: 30000 },
)

const VIEW_WIDTH = 300
const VIEW_HEIGHT = 100
const PADDING_Y = 10

const windowSamples = computed(() => {
  if (props.samples.length === 0) return []
  const latest = props.samples[props.samples.length - 1].timestamp
  return props.samples.filter((sample) => latest - sample.timestamp <= props.windowMs)
})

const points = computed(() => {
  const list = windowSamples.value
  if (list.length < 2) return ''

  const latest = list[list.length - 1].timestamp
  const oldest = latest - props.windowMs
  const voltages = list.map((sample) => sample.voltage)
  const minV = Math.min(...voltages)
  const maxV = Math.max(...voltages)
  const range = Math.max(maxV - minV, 0.5)

  return list
    .map((sample) => {
      const x = ((sample.timestamp - oldest) / props.windowMs) * VIEW_WIDTH
      const normalized = (sample.voltage - minV) / range
      const y = VIEW_HEIGHT - PADDING_Y - normalized * (VIEW_HEIGHT - PADDING_Y * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <div class="chart-wrap">
    <svg :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`" preserveAspectRatio="none" class="chart-svg">
      <line
        v-for="gridY in [25, 50, 75]"
        :key="gridY"
        x1="0"
        :y1="gridY"
        :x2="VIEW_WIDTH"
        :y2="gridY"
        class="grid-line"
      />
      <polyline v-if="points" :points="points" class="voltage-line" />
    </svg>
    <div v-if="windowSamples.length === 0" class="chart-empty">尚無電壓資料</div>
  </div>
</template>

<style scoped>
.chart-wrap {
  position: relative;
  width: 100%;
  height: 140px;
}

.chart-svg {
  width: 100%;
  height: 100%;
}

.grid-line {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 1;
}

.voltage-line {
  fill: none;
  stroke: var(--color-probe-voltage);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}
</style>
