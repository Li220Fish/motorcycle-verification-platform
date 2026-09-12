<script setup lang="ts">
/**
 * Admin-only debug view of one IMU stability item (ENG-07 怠速穩定度 / ENG-08
 * 油門轉動運轉穩定度) — plots the SAME accelerometer-magnitude series the
 * deterministic classifier itself analyzes (imu-feature-extractor.ts's
 * `accMagnitude`: sqrt(ax²+ay²+az²) after subtracting each axis's own
 * per-phase mean, exactly mirroring imu-preprocessor.ts), sliced to this
 * item's own phase window out of the single 0-23s recording — not the raw
 * JSON dump, which nobody could read at a glance. Only a magnitude chart:
 * https://en.wikipedia.org/wiki/Coefficient_of_variation is what the real
 * classifier keys off (window-to-window RMS/energy CV), which a rendered
 * per-sample line makes visually obvious (jittery vs. smooth) without
 * needing to reproduce that exact windowed-CV math here too.
 */
import { computed, onMounted, ref } from 'vue'
import {
  ENGINE_IDLE_ITEM_IDS,
  ENGINE_REV_ITEM_IDS,
  ENGINE_SESSION_PHASES,
} from '@/data/verification/engine-session'

const props = defineProps<{
  evidenceUrl: string
  itemId: string
  resultTone: 'ok' | 'attn' | 'mute'
}>()

interface ImuSample {
  tMs: number
  ax: number
  ay: number
  az: number
}
interface ImuSessionJson {
  samples: ImuSample[]
}

const loading = ref(true)
const errorMessage = ref('')
const points = ref<{ x: number; y: number }[]>([])
const stats = ref<{ sampleCount: number; effectiveHz: number; phaseLabel: string } | null>(null)

const phaseBounds = computed(() => {
  if ((ENGINE_IDLE_ITEM_IDS as readonly string[]).includes(props.itemId)) {
    return { ...ENGINE_SESSION_PHASES.idle, label: '怠速段 8–15s' }
  }
  if ((ENGINE_REV_ITEM_IDS as readonly string[]).includes(props.itemId)) {
    return { ...ENGINE_SESSION_PHASES.rev, label: '油門段 15–23s' }
  }
  return null
})

const CHART_WIDTH = 320
const CHART_HEIGHT = 100
const PAD = 4

const pathD = computed(() => {
  if (points.value.length < 2) return ''
  return points.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
})

const LINE_COLOR: Record<'ok' | 'attn' | 'mute', string> = {
  ok: 'var(--ok)',
  attn: 'var(--risk)',
  mute: 'var(--faint)',
}

onMounted(async () => {
  const bounds = phaseBounds.value
  if (!bounds) {
    errorMessage.value = '不是已知的怠速／油門項目'
    loading.value = false
    return
  }
  try {
    const res = await fetch(props.evidenceUrl, { cache: 'no-store' })
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
    const json = (await res.json()) as ImuSessionJson
    const samples = json.samples ?? []
    if (samples.length === 0) throw new Error('沒有樣本資料')

    // Same origin-normalization as engine-sensor-session.service.ts's
    // sliceSamples — handles both the (now fixed) relative tMs format and
    // older data still carrying an absolute Date.now() epoch value.
    const originMs = samples[0].tMs
    const sliced = samples.filter((s) => {
      const relativeMs = s.tMs - originMs
      return relativeMs >= bounds.startMs && relativeMs < bounds.endMs
    })
    if (sliced.length === 0) throw new Error('此區間內沒有樣本（切片後為空）')

    const mean = (values: number[]): number =>
      values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
    const meanAx = mean(sliced.map((s) => s.ax))
    const meanAy = mean(sliced.map((s) => s.ay))
    const meanAz = mean(sliced.map((s) => s.az))
    const magnitudes = sliced.map((s) =>
      Math.sqrt((s.ax - meanAx) ** 2 + (s.ay - meanAy) ** 2 + (s.az - meanAz) ** 2),
    )

    const minMag = Math.min(...magnitudes)
    const maxMag = Math.max(...magnitudes)
    const magRange = maxMag - minMag || 1
    const phaseDurationMs = bounds.endMs - bounds.startMs

    points.value = sliced.map((s, i) => {
      const relativeMs = s.tMs - originMs - bounds.startMs
      const x = PAD + (relativeMs / phaseDurationMs) * (CHART_WIDTH - PAD * 2)
      const y =
        CHART_HEIGHT - PAD - ((magnitudes[i] - minMag) / magRange) * (CHART_HEIGHT - PAD * 2)
      return { x, y }
    })

    const durationSec = phaseDurationMs / 1000
    stats.value = {
      sampleCount: sliced.length,
      effectiveHz: Math.round((sliced.length / durationSec) * 10) / 10,
      phaseLabel: bounds.label,
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '載入失敗'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="imu-chart">
    <p v-if="loading" class="imu-chart-status">載入中...</p>
    <p v-else-if="errorMessage" class="imu-chart-status error">{{ errorMessage }}</p>
    <template v-else>
      <svg
        :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`"
        class="imu-chart-svg"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          :y1="CHART_HEIGHT / 2"
          :x2="CHART_WIDTH"
          :y2="CHART_HEIGHT / 2"
          class="imu-chart-gridline"
        />
        <path :d="pathD" fill="none" :stroke="LINE_COLOR[resultTone]" stroke-width="1.5" />
      </svg>
      <p v-if="stats" class="imu-chart-caption">
        {{ stats.phaseLabel }} · {{ stats.sampleCount }} 筆樣本 · 約 {{ stats.effectiveHz }} Hz
      </p>
    </template>
  </div>
</template>

<style scoped>
.imu-chart {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.imu-chart-status {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.imu-chart-status.error {
  color: var(--risk);
}

.imu-chart-svg {
  width: 100%;
  height: 60px;
  background: var(--ground);
  border-radius: 4px;
}

.imu-chart-gridline {
  stroke: var(--line);
  stroke-width: 1;
}

.imu-chart-caption {
  margin: 0;
  font-size: 10.5px;
  color: var(--faint);
}
</style>
