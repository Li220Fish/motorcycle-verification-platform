<script setup lang="ts">
/**
 * 基本13項健檢 — a lightweight point-and-tap checklist over a reference
 * motorcycle photo (front 3/4 view page 1, the same photo mirrored for the
 * rear-facing items on page 2). Ported from a standalone HTML prototype;
 * this first pass is deliberately self-contained (in-memory state only, no
 * Firestore/AI wiring) so it can be reached from 驗車進度 without touching
 * the deep per-item evidence/answer pipeline the rest of verification.store.ts
 * drives — that wiring is a separate follow-up once this UI is confirmed.
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Check } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { BIKE_REFERENCE_PHOTO } from './basic-health-check-photo'
import {
  BASIC_HEALTH_CHECK_BASE_ITEMS,
  BASIC_HEALTH_CHECK_CHAIN_ITEM,
  basicHealthCheckItemsFor,
  type HealthCheckAnchor,
} from '@/data/verification/basic-health-check-items'
import { vehicleModelService } from '@/services/firebase/vehicle-model.service'

const props = defineProps<{
  hasChain?: boolean | null
  /** vehicleModels/{id} to fetch the reference photo + per-item anchors
   *  from. Omitted (or fetch skipped) when anchorsOverride is supplied
   *  directly instead — see the admin preview path below. */
  modelId?: string | null
  /** Per-item anchor overrides — when provided, used as-is instead of
   *  fetching by modelId. Lets HealthCheckAnnotationPreview.vue (admin) feed
   *  in-progress/unsaved draft anchors without a Firestore round-trip. */
  anchorsOverride?: Record<string, HealthCheckAnchor> | null
  /** Same idea as anchorsOverride, for the reference photo — lets the admin
   *  preview show *this* model's photo even before modelId's fetch would. */
  coverImageOverride?: string | null
  /** Admin preview mode (HealthCheckAnnotationPreview.vue): hides the bottom
   *  "完成" bar and the header's back-navigation affordance, since this
   *  isn't a real verification flow — just a live render of the in-progress
   *  anchor data. */
  previewMode?: boolean
}>()
const emit = defineEmits<{ back: [] }>()

interface ChecklistItem {
  key: string
  label: string
  /** [x%, y%] position of the feature on the reference photo. Page 2 reuses
   *  the same photo mirrored (scaleX(-1)), so its anchors are pre-mirrored
   *  (100 - original_x) to line up with the flipped image — see
   *  HealthCheckAnnotationEditor.vue's coordinate-capture comment for why no
   *  extra math is needed when an admin places these. */
  anchor: [number, number]
  page: 1 | 2
  required: boolean
}

// state/notes are keyed off the full superset (chain included) regardless of
// props.hasChain, so toggling that prop never changes the reactive objects'
// shape — only which items actually render.
const ALL_ITEM_KEYS = [...BASIC_HEALTH_CHECK_BASE_ITEMS, BASIC_HEALTH_CHECK_CHAIN_ITEM].map(
  (it) => it.key,
)

const fetchedAnchors = ref<Record<string, HealthCheckAnchor> | null>(null)
const fetchedCoverImageUrl = ref<string | null>(null)
const loadingModel = ref(false)

async function loadModelData(modelId: string): Promise<void> {
  loadingModel.value = true
  try {
    const data = await vehicleModelService.getHealthCheckData(modelId)
    fetchedAnchors.value = data?.healthCheckAnchors ?? null
    fetchedCoverImageUrl.value = data?.coverImageUrl ?? null
  } catch (error) {
    console.error('[BasicHealthCheck13] failed to load model health-check data', error)
    fetchedAnchors.value = null
    fetchedCoverImageUrl.value = null
  } finally {
    loadingModel.value = false
  }
}

onMounted(() => {
  if (!props.anchorsOverride && props.modelId) void loadModelData(props.modelId)
})
watch(
  () => props.modelId,
  (modelId) => {
    if (!props.anchorsOverride && modelId) void loadModelData(modelId)
  },
)

const activeAnchors = computed(() => props.anchorsOverride ?? fetchedAnchors.value)
const photoUrl = computed(
  () => props.coverImageOverride ?? fetchedCoverImageUrl.value ?? BIKE_REFERENCE_PHOTO,
)

const ITEMS = computed<ChecklistItem[]>(() => {
  const defs = basicHealthCheckItemsFor(props.hasChain)
  const anchors = activeAnchors.value
  if (!anchors) return []
  return defs
    .filter((def) => anchors[def.key])
    .map((def) => ({
      key: def.key,
      label: def.label,
      required: def.required,
      anchor: [anchors[def.key].x, anchors[def.key].y] as [number, number],
      page: anchors[def.key].page,
    }))
})

// True once loading has settled and there's simply nothing to show — either
// this model has never been annotated (anchors === null) or every item was
// filtered out for lacking a placed anchor. Distinct from "still loading" so
// the checklist doesn't flash an empty state before the fetch resolves.
const notAnnotated = computed(() => !loadingModel.value && ITEMS.value.length === 0)

interface NoteItem {
  key: string
  label: string
  placeholder: string
}

const NOTE_ITEMS: NoteItem[] = [
  {
    key: 'electrical',
    label: '電系改裝說明（選填）',
    placeholder: '請說明電系改裝內容，例如：加裝行車紀錄器、更換 LED 大燈組……',
  },
  {
    key: 'othermod',
    label: '其他改裝品說明（選填）',
    placeholder: '請說明其他改裝項目，例如：更換排氣管、外殼貼膜……',
  },
]

const state = reactive<Record<string, boolean>>(
  Object.fromEntries(ALL_ITEM_KEYS.map((key) => [key, false])),
)
const notes = reactive<Record<string, string>>(
  Object.fromEntries(NOTE_ITEMS.map((n) => [n.key, ''])),
)

const PAGE_COUNT = 2
const currentPage = ref<1 | 2>(1)
const finished = ref(false)

const pageItems = computed(() => ITEMS.value.filter((it) => it.page === currentPage.value))
const isMirrored = computed(() => currentPage.value === 2)

const pageRequiredMet = computed(() =>
  ITEMS.value
    .filter((it) => it.page === currentPage.value && it.required)
    .every((it) => state[it.key]),
)

const doneCount = computed(() => ITEMS.value.filter((it) => state[it.key]).length)
const progressPercent = computed(() =>
  ITEMS.value.length > 0 ? (doneCount.value / ITEMS.value.length) * 100 : 0,
)

const activeNotes = computed(() => NOTE_ITEMS.filter((n) => state[n.key]))

const allRequiredDone = computed(
  () =>
    ITEMS.value.length > 0 && ITEMS.value.filter((it) => it.required).every((it) => state[it.key]),
)

function toggle(key: string): void {
  state[key] = !state[key]
}

function goPage(delta: number): void {
  const next = currentPage.value + delta
  if (next < 1 || next > PAGE_COUNT) return
  if (delta > 0 && !pageRequiredMet.value) return
  currentPage.value = next as 1 | 2
}

function finish(): void {
  finished.value = true
}
</script>

<template>
  <div>
    <AppHeader title="基本13項健檢" :back="!previewMode" custom-back @back="emit('back')" />

    <div v-if="loadingModel" class="content">
      <p class="intro">載入中...</p>
    </div>

    <div v-else-if="notAnnotated" class="content">
      <div class="empty-state">
        <p>此車款尚未設定健檢標記位置，請聯繫客服協助處理。</p>
        <PrimaryButton v-if="!previewMode" block @click="emit('back')">返回</PrimaryButton>
      </div>
    </div>

    <div v-else class="content">
      <p class="intro">
        點擊車輛照片上的項目標籤，即可標示已檢查／未檢查，並確認左右兩側外觀角度。
      </p>

      <div class="bike-card">
        <div class="bike-img-wrap" :class="{ mirrored: isMirrored }">
          <div class="bike-photo">
            <img :src="photoUrl" class="bike-illustration" alt="車輛參考圖" />
          </div>
          <button
            v-for="it in pageItems"
            :key="it.key"
            class="chip"
            :class="[
              it.anchor[0] < 50 ? 'side-left' : 'side-right',
              { required: it.required && !state[it.key], checked: state[it.key] },
            ]"
            :style="{ left: it.anchor[0] + '%', top: it.anchor[1] + '%' }"
            @click="toggle(it.key)"
          >
            <span class="dot"><Check v-if="state[it.key]" :size="11" /></span>
            <span class="label">{{ it.label }}</span>
          </button>
        </div>

        <div class="page-nav">
          <button :disabled="currentPage === 1" aria-label="上一頁" @click="goPage(-1)">‹</button>
          <span class="count">{{ currentPage }} / {{ PAGE_COUNT }}</span>
          <button
            :disabled="currentPage === PAGE_COUNT || !pageRequiredMet"
            aria-label="下一頁"
            @click="goPage(1)"
          >
            ›
          </button>
        </div>
        <p v-if="currentPage < PAGE_COUNT && !pageRequiredMet" class="required-hint">
          請先完成本頁標示的必填項目，才能前往下一頁
        </p>
      </div>

      <div class="progress-card">
        <div class="progress-head">
          <span>檢查進度</span>
          <span class="progress-count"
            >{{ doneCount }}<span class="of">/{{ ITEMS.length }}</span></span
          >
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
      </div>

      <div v-if="activeNotes.length > 0" class="notes-wrap">
        <div v-for="n in activeNotes" :key="n.key" class="note-card">
          <label>{{ n.label }}</label>
          <textarea v-model="notes[n.key]" :placeholder="n.placeholder" />
        </div>
      </div>
    </div>

    <div v-if="!previewMode && !loadingModel && !notAnnotated" class="bottom-bar">
      <PrimaryButton v-if="!finished" block :disabled="!allRequiredDone" @click="finish">
        完成基本13項健檢
      </PrimaryButton>
      <template v-else>
        <p class="done-message">已完成基本13項健檢 ✓</p>
        <PrimaryButton block @click="emit('back')">回到驗車進度</PrimaryButton>
      </template>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-bottom: 100px;
}

.intro {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  margin: 0;
}

.empty-state {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg, 24px);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  color: var(--color-text-secondary);
  font-size: 13px;
}

.bike-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.bike-img-wrap {
  position: relative;
  width: 100%;
  /* Matches the reference photo's own aspect ratio — a fixed inset box
     (8% margin all round) keeps the bike a bit smaller than the card
     instead of filling it edge-to-edge. */
  padding-top: 118.96%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-background);
}

.bike-photo {
  position: absolute;
  left: 8%;
  top: 8%;
  width: 84%;
  height: 84%;
}

.bike-illustration {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bike-img-wrap.mirrored .bike-illustration {
  transform: scaleX(-1);
}

.chip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  white-space: nowrap;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.chip.side-left {
  flex-direction: row-reverse;
}

.dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  border: 1.5px solid var(--color-border);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(20, 24, 31, 0.3);
}

.chip.required .dot {
  background: var(--color-warning-bg);
  border-color: var(--color-warning);
}

.chip.checked .dot {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.label {
  font-size: 11px;
  font-weight: 800;
  color: #14181f;
  text-shadow:
    0 0 4px #fff,
    0 0 4px #fff,
    0 0 4px #fff;
}

.page-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}

.page-nav button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1;
}

.page-nav button:disabled {
  opacity: 0.3;
}

.page-nav .count {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-secondary);
  min-width: 34px;
  text-align: center;
}

.required-hint {
  text-align: center;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-warning);
  margin: 0;
}

.progress-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
  font-size: 13px;
  font-weight: 700;
}

.progress-count {
  color: var(--color-primary);
}

.progress-count .of {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.progress-track {
  height: 6px;
  border-radius: 999px;
  background: var(--color-background);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--color-primary);
  transition: width 0.2s ease;
}

.notes-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.note-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.note-card label {
  display: block;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 6px;
}

.note-card textarea {
  width: 100%;
  min-height: 56px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-family: inherit;
  font-size: 12px;
  color: var(--color-text-primary);
  background: var(--color-background);
  resize: vertical;
  box-sizing: border-box;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--space-md);
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.done-message {
  text-align: center;
  font-weight: 700;
  color: var(--color-success);
  margin: 0;
}
</style>
