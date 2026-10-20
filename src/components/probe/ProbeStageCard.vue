<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

import { useI18n } from '@/composables/useI18n'
import {
  formatStageValue,
  gradeTone,
  type ProbeReading,
  type ProbeStage,
} from '@/services/probe/probe-protocol'

const props = withDefaults(
  defineProps<{
    stage: ProbeStage
    reading?: ProbeReading | null
    running?: boolean
    progress?: string
    /** Small label in front of the title (e.g. 冷車／熱車 in the report). */
    tag?: string
    variant?: 'dark' | 'light'
    showDescription?: boolean
  }>(),
  {
    reading: null,
    running: false,
    progress: '',
    tag: '',
    variant: 'light',
    showDescription: false,
  },
)

const { t, isEnglish } = useI18n()

const tone = computed(() => gradeTone(props.reading))
const title = computed(() => t('probe', `stage${props.stage}`))
const description = computed(() => t('probe', `stage${props.stage}Desc`))
const valueText = computed(() =>
  props.reading ? formatStageValue(props.stage, props.reading.primaryValue) : '—',
)
const statusText = computed(() => {
  const reading = props.reading
  if (!reading) return t('probe', 'notMeasured')
  if (reading.status === 'TIMEOUT') return reading.judgment || t('probe', 'statusTIMEOUT')
  if (reading.status === 'ERROR') return reading.judgment || t('probe', 'statusERROR')
  // The detailed judgment text is Chinese (app grading / firmware); English
  // mode shows the grade label instead.
  if (isEnglish() && reading.grade) return t('probe', `grade${reading.grade}`)
  return reading.judgment
})
</script>

<template>
  <div class="stage-card" :class="[variant, tone]">
    <div class="stage-main">
      <p class="stage-title">
        <span v-if="tag" class="stage-tag">{{ tag }}</span
        >{{ title }}
      </p>
      <p v-if="showDescription" class="stage-desc">{{ description }}</p>
      <p v-if="running" class="stage-progress">
        <Loader2 :size="13" class="spin" />{{ progress || t('probe', 'running') }}
      </p>
      <p v-else class="stage-status">{{ statusText }}</p>
    </div>
    <div class="stage-value">{{ running ? '…' : valueText }}</div>
    <slot />
  </div>
</template>

<style scoped>
.stage-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-left-width: 4px;
}

.stage-card.dark {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.stage-card.good {
  border-left-color: var(--color-success);
}
.stage-card.warning {
  border-left-color: var(--color-warning);
}
.stage-card.bad {
  border-left-color: var(--color-danger);
}

.stage-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stage-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
}

.stage-tag {
  display: inline-block;
  margin-right: 6px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: var(--color-background);
  color: var(--color-text-secondary);
}

.dark .stage-tag {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.75);
}

.stage-desc,
.stage-status,
.stage-progress {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.dark .stage-desc,
.dark .stage-status,
.dark .stage-progress {
  color: rgba(255, 255, 255, 0.6);
}

.stage-progress {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stage-value {
  font-size: 17px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.good .stage-value {
  color: var(--color-success);
}
.warning .stage-value {
  color: var(--color-warning);
}
.bad .stage-value {
  color: var(--color-danger);
}
.dark.good .stage-value {
  color: var(--color-probe-voltage);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
