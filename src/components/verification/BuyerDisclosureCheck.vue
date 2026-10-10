<script setup lang="ts">
/**
 * 買家複驗專屬的「其他主動揭露」畫面 — replaces plain VerificationItem.vue
 * rendering for the seller-phase4-disclosure section when flowKind==='buyer'
 * (see VerificationStepsView.vue). Bypasses the normal getFlatItems/
 * isItemVisible pipeline entirely (that pipeline hides every optional item
 * for buyers, which is exactly the gap this component exists to fill) —
 * instead it builds its own dynamic row list from two sources:
 *   1. Whatever the SELLER actually disclosed on the 9 PREP-/ELEC-10..13
 *      /ENG-01 items (only the ones they actually answered, not every item).
 *   2. The vehicle model's known common issues (通病), snapshotted onto this
 *      verification by VerificationStepsView.vue's year-gate flow (see
 *      Verification['buyerKnownIssuesSnapshot']).
 * Each row uses the SAME tap/long-press confirm gesture as BasicHealthCheck
 * 13.vue (via the shared useTapConfirmItem composable), saved under a
 * synthetic item id scoped to the BUYER's own verification/answers — never
 * required, never blocks completing the verification (matches the seller
 * flow's own "全部選填" posture for this same section).
 */
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, Check, X } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import MultiPhotoEvidenceCapture from './MultiPhotoEvidenceCapture.vue'
import { useTapConfirmItem } from '@/composables/useTapConfirmItem'
import { SELLER_VERIFICATION_SECTIONS } from '@/data/verification/seller-verification'
import { storageService } from '@/services/firebase/storage.service'
import { verificationService } from '@/services/firebase/verification.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { VehicleModelKnownIssuePart } from '@/services/firebase/vehicle-model.service'
import type { VerificationAnswer } from '@/types/verification-evidence'

const emit = defineEmits<{ back: []; advance: [] }>()
const verificationStore = useVerificationStore()

const DISCLOSURE_SECTION_ID = 'seller-phase4-disclosure'
const disclosureItemDefs =
  SELLER_VERIFICATION_SECTIONS.find((section) => section.id === DISCLOSURE_SECTION_ID)?.items ?? []

const PART_LABEL: Record<VehicleModelKnownIssuePart, string> = {
  sides: '左右側外觀',
  rear: '車尾',
  front_suspension: '前避震',
  engine_bottom: '引擎底部／傳動',
  general: '其他',
}

interface DisclosureRow {
  key: string
  label: string
  description: string
  sellerNote?: string
  sellerPhotoUrls: string[]
  isKnownIssue: boolean
}

const rows = ref<DisclosureRow[]>([])
const loading = ref(true)
const expandedKey = ref<string | null>(null)

/** "賣家有提到這個項目" — answered (not null/not_applicable); PREP-02's
 *  multi-select disclosure additionally needs a real selection beyond 無,
 *  since an empty/'none' selection there is the seller actively saying
 *  "nothing to flag", not something worth re-confirming. */
function isMentioned(itemId: string, answer: VerificationAnswer | undefined): boolean {
  if (!answer || answer.result == null || answer.result === 'not_applicable') return false
  if (itemId === 'PREP-02') {
    const selections = answer.selections ?? []
    if (selections.length === 0) return false
    if (selections.length === 1 && selections[0] === 'none') return false
  }
  return true
}

async function resolveUrls(paths: string[]): Promise<string[]> {
  const resolved = await Promise.all(
    paths.map((path) => storageService.resolveDownloadUrl(path).catch(() => null)),
  )
  return resolved.filter((url): url is string => !!url)
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const verification = verificationStore.currentVerification
    if (!verification) return
    const result: DisclosureRow[] = []

    const sellerVerificationId = verification.relatedVerificationId
    if (sellerVerificationId) {
      const [sellerAnswers, sellerEvidence] = await Promise.all([
        verificationService.listAnswers(sellerVerificationId).catch(() => []),
        verificationService.listEvidence(sellerVerificationId).catch(() => []),
      ])
      const answerById = new Map(sellerAnswers.map((answer) => [answer.itemId, answer]))
      for (const def of disclosureItemDefs) {
        const answer = answerById.get(def.id)
        if (!isMentioned(def.id, answer)) continue
        const evidencePaths = sellerEvidence
          .filter((evidence) => evidence.itemId === def.id)
          .map((evidence) => evidence.remoteUrl)
          .filter((path): path is string => !!path)
        result.push({
          key: `buyer-disclosure-seller-${def.id}`,
          label: def.title,
          description: def.description,
          sellerNote: answer?.note,
          sellerPhotoUrls: await resolveUrls(evidencePaths),
          isKnownIssue: false,
        })
      }
    }

    for (const issue of verification.buyerKnownIssuesSnapshot ?? []) {
      result.push({
        key: `buyer-disclosure-knownissue-${issue.id}`,
        label: `系統偵測：${PART_LABEL[issue.part] ?? '其他'}`,
        description: issue.description,
        sellerPhotoUrls: [],
        isKnownIssue: true,
      })
    }

    rows.value = result
    hydrate()
  } finally {
    loading.value = false
  }
}
onMounted(load)

function saveResult(key: string, value: 'pass' | 'fail'): void {
  void verificationStore.saveAnswer(key, value === 'pass' ? 'normal' : 'attention')
}
const {
  state,
  pickerKey,
  handlePointerDown,
  handlePointerUpOrLeave,
  handleClick,
  pick,
  closePicker,
} = useTapConfirmItem(saveResult)

// Hydrate from whatever the buyer already answered on a previous visit —
// called once `rows` is populated (declared above `load()`'s own call site
// via function hoisting).
function hydrate(): void {
  for (const row of rows.value) {
    const existing = verificationStore.answers[row.key]
    if (!existing) continue
    if (existing.result === 'normal') state[row.key] = 'pass'
    else if (existing.result === 'attention') state[row.key] = 'fail'
  }
}

function toggleExpand(key: string): void {
  expandedKey.value = expandedKey.value === key ? null : key
}

const activePhotoKey = ref<string | null>(null)
function openPhotoCapture(key: string): void {
  activePhotoKey.value = key
}
function closePhotoCapture(): void {
  activePhotoKey.value = null
}

const verificationId = computed(() => verificationStore.currentVerification?.id ?? '')
</script>

<template>
  <div>
    <AppHeader title="其他主動揭露" back custom-back @back="emit('back')" />

    <div class="content">
      <p class="intro">
        以下是賣家主動揭露的項目，以及系統依車型偵測到的常見通病，點擊確認現場狀況是否一致（全部選填，不影響完成驗證）。
      </p>

      <p v-if="loading" class="empty-hint">載入中...</p>
      <p v-else-if="rows.length === 0" class="empty-hint">這台車沒有需要額外確認的揭露項目。</p>

      <div v-else class="row-list">
        <div v-for="row in rows" :key="row.key" class="disclosure-row">
          <div
            class="row-main"
            :class="{ pass: state[row.key] === 'pass', fail: state[row.key] === 'fail' }"
            @pointerdown="handlePointerDown(row.key)"
            @pointerup="handlePointerUpOrLeave"
            @pointerleave="handlePointerUpOrLeave"
            @pointercancel="handlePointerUpOrLeave"
            @contextmenu.prevent
            @click="handleClick(row.key)"
          >
            <span class="row-label">{{ row.label }}</span>
            <span class="row-status">
              <template v-if="state[row.key] === 'pass'"><Check :size="13" />一致</template>
              <template v-else-if="state[row.key] === 'fail'"><X :size="13" />不一致</template>
              <template v-else>待確認</template>
            </span>
          </div>
          <button class="row-expand-toggle" @click="toggleExpand(row.key)">
            <ChevronDown :size="14" :class="{ rotated: expandedKey === row.key }" />
            {{ expandedKey === row.key ? '收合' : '查看詳情' }}
          </button>

          <div v-if="expandedKey === row.key" class="row-detail">
            <p class="row-description">{{ row.description }}</p>
            <p v-if="row.sellerNote" class="row-seller-note">賣家備註：{{ row.sellerNote }}</p>
            <div v-if="row.sellerPhotoUrls.length > 0" class="row-photo-grid">
              <img v-for="url in row.sellerPhotoUrls" :key="url" :src="url" alt="賣家提供照片" />
            </div>
          </div>

          <div v-if="state[row.key] !== undefined" class="row-answered-actions">
            <button class="row-photo-btn" @click="openPhotoCapture(row.key)">
              拍照存證{{
                (verificationStore.evidenceByItem[row.key]?.length ?? 0) > 0
                  ? `（${verificationStore.evidenceByItem[row.key].length}）`
                  : ''
              }}
            </button>
          </div>

          <div
            v-if="pickerKey === row.key"
            class="picker-backdrop"
            @click="closePicker"
            @touchstart.prevent="closePicker"
          />
          <div v-if="pickerKey === row.key" class="inline-picker">
            <button class="reaction-btn pass" aria-label="一致" @click="pick(row.key, 'pass')">
              <Check :size="18" />
            </button>
            <button class="reaction-btn fail" aria-label="不一致" @click="pick(row.key, 'fail')">
              <X :size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading" class="bottom-bar">
      <PrimaryButton block @click="emit('advance')">下一步</PrimaryButton>
    </div>

    <MultiPhotoEvidenceCapture
      v-if="activePhotoKey"
      :verification-id="verificationId"
      :item-id="activePhotoKey"
      label="拍照存證"
      @advance="closePhotoCapture"
    />
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

.empty-hint {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.disclosure-row {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
}

.row-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  cursor: pointer;
  user-select: none;
}

.row-label {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.row-status {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-disabled);
}

.row-main.pass .row-status {
  color: var(--color-success);
}

.row-main.fail .row-status {
  color: var(--color-danger);
}

.row-expand-toggle {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  padding: 0;
}

.row-expand-toggle :deep(.rotated) {
  transform: rotate(180deg);
}

.row-detail {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-description {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.row-seller-note {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-text-primary);
}

.row-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.row-photo-grid img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.row-answered-actions {
  margin-top: var(--space-sm);
}

.row-photo-btn {
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 12.5px;
  font-weight: 600;
}

.picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3;
  background: transparent;
}

.inline-picker {
  position: absolute;
  top: 6px;
  right: var(--space-md);
  display: flex;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 6px;
  box-shadow: 0 6px 20px rgba(20, 24, 31, 0.35);
  z-index: 4;
}

.reaction-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.reaction-btn.pass {
  background: var(--color-success);
}

.reaction-btn.fail {
  background: var(--color-danger);
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--space-md);
  padding-bottom: calc(
    var(--space-md) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom))
  );
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}
</style>
