<script setup lang="ts">
/**
 * Live "recording in progress" bar visualization, shared by every Engine
 * session's measurement panel (spec: 底下顯示錄音音軌或 IMU 測量數值，
 * 用一致的波形風格呈現兩種資料). Two data modes:
 *
 * - `magnitude` supplied (idle/rev sessions, which also capture motion):
 *   bars are driven by the REAL accelerometer-magnitude value the parent
 *   passes in each tick (see EngineInspectionFlow.vue's motion sample
 *   callback) — genuinely reactive, not decorative.
 * - `magnitude` omitted (startup session, audio-only): there is no live
 *   audio-level source in this app (capacitor-voice-recorder only returns
 *   the finished blob, no streaming amplitude), so the bars instead run a
 *   gentle decorative pulse purely to indicate "recording is active". This
 *   is never presented as a real waveform of the captured audio.
 */
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    active: boolean
    /** Normalized 0..1 real motion-magnitude sample, updated by the parent
     *  on every devicemotion event while `active` is true. */
    magnitude?: number | null
  }>(),
  { magnitude: null },
)

const BAR_COUNT = 28
const bars = ref<number[]>(Array.from({ length: BAR_COUNT }, () => 0.08))
let tickTimer: ReturnType<typeof setInterval> | null = null

function pushBar(value: number): void {
  bars.value = [...bars.value.slice(1), Math.min(1, Math.max(0.06, value))]
}

function decorativeTick(): void {
  // Smooth pseudo-random pulse — no single bar jumps too far from its
  // neighbor, so it reads as "alive" rather than flickering noise.
  const last = bars.value[bars.value.length - 1] ?? 0.3
  const next = last + (Math.random() - 0.5) * 0.35
  pushBar(next)
}

function startTicking(): void {
  stopTicking()
  tickTimer = setInterval(() => {
    if (props.magnitude === null || props.magnitude === undefined) {
      decorativeTick()
    }
    // When `magnitude` is provided, the watcher below pushes bars directly
    // on every real sample instead of on this fixed interval.
  }, 120)
}

function stopTicking(): void {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = null
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      bars.value = Array.from({ length: BAR_COUNT }, () => 0.08)
      startTicking()
    } else {
      stopTicking()
    }
  },
  { immediate: true },
)

watch(
  () => props.magnitude,
  (value) => {
    if (props.active && value !== null && value !== undefined) pushBar(value)
  },
)

onBeforeUnmount(stopTicking)
</script>

<template>
  <div class="waveform" :class="{ active }">
    <span
      v-for="(height, index) in bars"
      :key="index"
      class="bar"
      :style="{ height: `${height * 100}%` }"
    />
  </div>
</template>

<style scoped>
.waveform {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 64px;
  padding: 0 var(--space-sm);
}

.bar {
  flex: 1;
  min-width: 2px;
  max-width: 6px;
  border-radius: 999px;
  background: var(--color-border);
  transition: height 0.12s ease;
}

.waveform.active .bar {
  background: var(--color-primary);
}
</style>
