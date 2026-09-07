<script setup lang="ts">
import { Check, Circle, Loader2, Lock } from 'lucide-vue-next'

import PrimaryButton from '@/components/common/PrimaryButton.vue'
import type { MissingRequiredItem, SectionProgress } from '@/stores/verification.store'
import type { VerificationSection } from '@/data/verification'

const props = defineProps<{
  sections: VerificationSection[]
  sectionProgress: SectionProgress[]
  loading: boolean
  missingRequiredItems: MissingRequiredItem[]
  pendingRequiredUploads: MissingRequiredItem[]
  failedRequiredUploads: MissingRequiredItem[]
  pendingRequiredAnalysis: string[]
  failedRequiredAnalysis: string[]
  completing: boolean
}>()

const emit = defineEmits<{ selectSection: [string]; complete: []; retryAnalysis: [string] }>()

// Human labels for Verification.analysisStatus's route keys (see
// functions/src/services/analysis-status.service.ts's AnalysisRouteKey) —
// these are the AI routes that must actually finish (not just fire) before
// completion; a capture already writes a placeholder Answer immediately, so
// without surfacing these separately "分析從沒真的跑過" looks identical to
// "分析已確認正常" to the user (see verification.store.ts's
// REQUIRED_ANALYSIS_KEYS comment for why the gate alone isn't enough).
const ANALYSIS_LABELS: Record<string, string> = {
  coreVision: '核心影像判定',
  dashboardOcr: '儀表板里程 OCR',
  coldCheck: '冷車觸感檢查',
  engineSensorSession: '引擎音訊／震動判定',
}
const analysisLabel = (key: string) => ANALYSIS_LABELS[key] ?? key

function progressFor(sectionId: string): SectionProgress | undefined {
  return props.sectionProgress.find((entry) => entry.sectionId === sectionId)
}

function statusFor(sectionId: string): 'not_started' | 'in_progress' | 'done' {
  const progress = progressFor(sectionId)
  if (!progress || progress.done === 0) return 'not_started'
  if (progress.done >= progress.total) return 'done'
  return 'in_progress'
}

function statusLabel(status: ReturnType<typeof statusFor>): string {
  if (status === 'done') return '已完成'
  if (status === 'in_progress') return '進行中'
  return '未開始'
}

function handleSelect(section: VerificationSection): void {
  if (props.loading) return
  emit('selectSection', section.id)
}

// A single plain-language line instead of an itemized breakdown — users
// don't need "分類—項目" jump links here, just enough to know why 完成驗證
// isn't available yet and where to go (回到上方分類).
function hintText(): string | null {
  if (props.missingRequiredItems.length > 0) {
    return `尚有 ${props.missingRequiredItems.length} 項必填未完成，請回到上方分類完成。`
  }
  if (props.failedRequiredUploads.length > 0) {
    return '部分必填照片／影音上傳失敗，請回到上方分類重試。'
  }
  if (props.pendingRequiredUploads.length > 0) {
    return '正在完成最後幾筆資料上傳，請稍候…'
  }
  if (props.failedRequiredAnalysis.length > 0) {
    return 'AI 分析失敗，請點選下方重試。'
  }
  if (props.pendingRequiredAnalysis.length > 0) {
    return 'AI 正在分析中，請稍候…'
  }
  return null
}

const canSubmit = () =>
  props.missingRequiredItems.length === 0 &&
  props.pendingRequiredUploads.length === 0 &&
  props.failedRequiredUploads.length === 0 &&
  props.pendingRequiredAnalysis.length === 0 &&
  props.failedRequiredAnalysis.length === 0
</script>

<template>
  <div class="verification-hub">
    <h2>驗車進度</h2>
    <p class="hint">選擇一個車輛部位開始拍攝</p>

    <div class="section-grid">
      <button
        v-for="section in sections"
        :key="section.id"
        class="section-card"
        :class="statusFor(section.id)"
        :disabled="loading"
        @click="handleSelect(section)"
      >
        <div class="card-top">
          <span class="card-title">{{ section.title }}</span>
          <Lock v-if="section.lockedOrder" :size="14" class="lock-icon" />
        </div>
        <p class="card-desc">{{ section.shortDescription }}</p>
        <div class="card-status">
          <Check v-if="statusFor(section.id) === 'done'" :size="14" class="status-icon done" />
          <Circle
            v-else
            :size="10"
            :class="['status-icon', statusFor(section.id) === 'in_progress' ? 'active' : 'idle']"
          />
          <span class="status-label">{{ statusLabel(statusFor(section.id)) }}</span>
          <span class="status-count">
            {{ progressFor(section.id)?.done ?? 0 }}/{{
              progressFor(section.id)?.total ?? section.items.length
            }}
          </span>
        </div>
      </button>
    </div>

    <p
      v-if="hintText()"
      class="progress-hint"
      :class="{ danger: failedRequiredUploads.length > 0 || failedRequiredAnalysis.length > 0 }"
    >
      {{ hintText() }}
    </p>
    <p v-else class="progress-hint all-done">所有必填項目已完成。</p>

    <div v-if="failedRequiredAnalysis.length > 0" class="analysis-retry-list">
      <div v-for="key in failedRequiredAnalysis" :key="key" class="analysis-retry-row">
        <span>{{ analysisLabel(key) }}</span>
        <button class="analysis-retry-btn" @click="emit('retryAnalysis', key)">重試</button>
      </div>
    </div>

    <PrimaryButton block :disabled="completing || !canSubmit()" @click="emit('complete')">
      <Loader2 v-if="completing" :size="16" class="spin" />
      {{ completing ? '處理中...' : '完成驗證' }}
    </PrimaryButton>
  </div>
</template>

<style scoped>
.verification-hub {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.verification-hub h2 {
  font-size: 20px;
  font-weight: 700;
}

.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-sm);
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  text-align: left;
}

.section-card.done {
  border-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 8%, var(--color-surface));
}

.section-card.in_progress {
  border-color: var(--color-primary);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.lock-icon {
  color: var(--color-text-disabled);
  flex: 0 0 auto;
}

.card-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
  min-height: 32px;
}

.card-status {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: auto;
}

.status-icon.done {
  color: var(--color-success);
}

.status-icon.active {
  color: var(--color-primary);
  fill: var(--color-primary);
}

.status-icon.idle {
  color: var(--color-text-disabled);
  fill: var(--color-text-disabled);
}

.status-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.status-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.progress-hint {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-warning);
  text-align: center;
  margin: var(--space-xs) 0 0;
}

.progress-hint.danger {
  color: var(--color-danger);
}

.progress-hint.all-done {
  color: var(--color-success);
}

.analysis-retry-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.analysis-retry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 8px var(--space-sm);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 6%, var(--color-surface));
  font-size: 13px;
  color: var(--color-text-primary);
}

.analysis-retry-btn {
  border: 1px solid var(--color-danger);
  background: var(--color-surface);
  color: var(--color-danger);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.spin {
  animation: verification-hub-spin 0.8s linear infinite;
}

@keyframes verification-hub-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
