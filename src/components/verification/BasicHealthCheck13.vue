<script setup lang="ts">
/**
 * 基本12項健檢 — a lightweight point-and-tap checklist over a reference
 * motorcycle photo (front 3/4 view page 1, the same photo mirrored for the
 * rear-facing items on page 2). Ported from a standalone HTML prototype;
 * originally self-contained (in-memory state only, no Firestore wiring),
 * reachable only from a dedicated 驗車進度 Hub card outside the normal
 * per-item flow. Now a real VerificationSection/tab (seller-verification.ts's
 * seller-phase2-basic-health) like everything else — VerificationStepsView.vue
 * swaps this component in whenever the current item id is one of
 * BASIC_HEALTH_CHECK_ITEM_IDS, same pattern as CorePhotoCaptureFlow.vue /
 * EngineInspectionFlow.vue. Each item's tap result is saved immediately via
 * verificationStore.saveAnswer (pass -> 'normal', fail -> 'attention') under
 * `BASIC-${key}`, hydrated back from verificationStore.answers on mount so
 * revisiting the tab shows prior taps instead of resetting.
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Camera, Check, MessageCircle, RotateCcw, X } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useI18n } from '@/composables/useI18n'
import { useKnownIssueReminder } from '@/composables/useKnownIssueReminder'
import { useTapConfirmItem } from '@/composables/useTapConfirmItem'
import { guessVehicleType } from '@/data/training/training-shots'
import { knownIssuesForBasicHealthCheckKey } from '@/data/verification/known-issue-mapping'
import { BIKE_REFERENCE_PHOTO } from './basic-health-check-photo'
import HealthCheckIssuePhotoCapture from './HealthCheckIssuePhotoCapture.vue'
import VerificationHelpSheet from './VerificationHelpSheet.vue'
import {
  BASIC_HEALTH_CHECK_BASE_ITEMS,
  BASIC_HEALTH_CHECK_CHAIN_ITEM,
  basicHealthCheckItemId,
  basicHealthCheckItemsFor,
  DEFAULT_HEALTH_CHECK_ANCHORS,
  type HealthCheckAnchor,
} from '@/data/verification/basic-health-check-items'
import { storageService } from '@/services/firebase/storage.service'
import { vehicleModelService } from '@/services/firebase/vehicle-model.service'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

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
   *  anchor data. Also skips the verificationStore wiring entirely (there is
   *  no active verification in this context). */
  previewMode?: boolean
  /** VerificationStepsView.vue renders this INSIDE VerificationLayout's own
   *  content area, below its own sticky AppHeader (z-index 10) and the
   *  category tabs (VerificationCategoryNav.vue, sticky, z-index 5) — this
   *  component's own AppHeader is *also* `position: sticky; top: 0; z-index:
   *  10`, so once scrolled it stuck to the very top of the screen and,
   *  sharing the outer header's z-index, painted over the tabs underneath
   *  it (found live: "往下滑上方的app-header會覆蓋掉tabs"). Set true to skip
   *  rendering it entirely — the outer layout already shows a back button
   *  and this section's title (as the active tab), so it's pure duplication
   *  once embedded rather than shown as its own standalone screen. Defaults
   *  false so HealthCheckAnnotationPreview.vue (no competing outer chrome)
   *  is untouched. */
  embedded?: boolean
}>()
/** `back` exits the whole consolidated screen early (mirrors
 *  CorePhotoCaptureFlow.vue's own back arrow) — VerificationStepsView.vue
 *  sends both back to the Hub. `advance` fires once the user taps through
 *  the post-完成 confirmation, continuing the flow past this whole section,
 *  same as every other consolidated capture group. */
const emit = defineEmits<{ back: []; advance: [] }>()
const verificationStore = useVerificationStore()
const vehicleStore = useVehicleStore()
const { tItem, t } = useI18n()

// 「異常」的證據照對 scooter/manual 用不同的引導框幾何（training-shots.ts
// 早就依 part key 分好了兩套），沒有強型別的 transmission 欄位可以直接讀，
// 借用 guessVehicleType 從既有的 transmission 自由文字＋hasChain 猜一個
// 合理預設——跟採集 App 判斷同一台車該用哪套引導框的邏輯一致。
const vehicleType = computed(() =>
  guessVehicleType(vehicleStore.currentVehicle?.transmission ?? null, props.hasChain ?? false),
)

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

// Unannotated models (no admin-placed anchors yet) fall back to the shared
// default photo + its matching default anchors as a pair — never the
// model's own uploaded coverImageUrl without anchors placed for it, since
// the default coordinates only line up with the default photo.
const activeAnchors = computed(
  () => props.anchorsOverride ?? fetchedAnchors.value ?? DEFAULT_HEALTH_CHECK_ANCHORS,
)
const photoUrl = computed(
  () =>
    props.coverImageOverride ??
    (fetchedAnchors.value ? fetchedCoverImageUrl.value : null) ??
    BIKE_REFERENCE_PHOTO,
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
    key: 'othermod',
    label: 'otherModLabel',
    placeholder: 'otherModPlaceholder',
  },
]
const NOTE_BY_KEY = new Map(NOTE_ITEMS.map((n) => [n.key, n]))

const notes = reactive<Record<string, string>>(
  Object.fromEntries(NOTE_ITEMS.map((n) => [n.key, ''])),
)

/** Persists one item's tap immediately, same "answer saved on interaction"
 *  pattern as every other checklist item — pass/fail map onto the normal
 *  AnswerResultValue vocabulary (正常/須注意) everything else already uses,
 *  so scoring/report/admin need no special case for this checklist. */
function saveResult(key: string, value: 'pass' | 'fail'): void {
  if (props.previewMode) return
  void verificationStore.saveAnswer(
    basicHealthCheckItemId(key),
    value === 'pass' ? 'normal' : 'attention',
    NOTE_BY_KEY.has(key) ? notes[key] || undefined : undefined,
  )
}

// Tap/long-press gesture + state (useTapConfirmItem.ts — shared with
// BuyerDisclosureCheck.vue's own dynamic item list).
const {
  state,
  pickerKey,
  handlePointerDown,
  handlePointerUpOrLeave,
  handleClick,
  pick,
  closePicker,
} = useTapConfirmItem(saveResult)

// 買家複驗：第一次點到某個有通病的項目（前避震/三角台/鏈條/尾燈——見
// known-issue-mapping.ts 的配置與理由）時跳出提醒，呼應使用者原話「在檢測該
// 部分的時候會有文字視窗做提醒」。掛在 pointerdown（長按跟快點都會先觸發這
// 個）上，一個項目只跳一次。
const {
  open: knownIssueOpen,
  activeIssues: knownIssueActiveIssues,
  maybeShow: maybeShowKnownIssue,
  close: closeKnownIssue,
} = useKnownIssueReminder()
const knownIssueTitle = computed(() => {
  const part = knownIssueActiveIssues.value[0]?.part
  return t('ui', 'knownIssueTitle', {
    part: part ? t('knownIssuePart', part) : t('ui', 'knownIssueFallback'),
  })
})
const knownIssueContent = computed(() =>
  knownIssueActiveIssues.value.map((issue) => issue.description).join('\n\n'),
)
function handleItemPointerDown(key: string): void {
  handlePointerDown(key)
  if (props.previewMode || verificationStore.flowKind !== 'buyer') return
  maybeShowKnownIssue(
    key,
    knownIssuesForBasicHealthCheckKey(
      verificationStore.currentVerification?.buyerKnownIssuesSnapshot,
      key,
    ),
  )
}

/** Which item's 證據照 camera is open, or null when closed. Opened only via
 *  the long-press picker's 相機 button now — marking 打叉(fail) used to
 *  force this open automatically, but photo-taking and pass/fail marking
 *  are now two separate choices in the picker (叉叉不會再轉跳到拍照). */
const issuePhotoKey = ref<string | null>(null)
function openIssuePhoto(key: string): void {
  closePicker()
  if (!props.previewMode) issuePhotoKey.value = key
}
function closeIssuePhoto(): void {
  issuePhotoKey.value = null
}

// 已拍攝的證據照 — result-row 右側的相機 icon，點了展開照片小卡（tooltip），
// 卡片底下的「重新拍攝」回到拍照模式；新照片拍好後才刪除舊的那張，取消重拍
// 則保留原照片。
function evidenceFor(key: string): VerificationEvidence[] {
  return (verificationStore.evidenceByItem[basicHealthCheckItemId(key)] ?? []).filter(
    (evidence) => evidence.type === 'photo',
  )
}
// `remoteUrl` is a Storage path, not a URL — resolve it once; `localUri`
// (a blob: URL) only works in the session that took the photo.
const resolvedEvidenceUrls = reactive<Record<string, string>>({})
watch(
  () => verificationStore.evidenceByItem,
  (byItem) => {
    for (const list of Object.values(byItem)) {
      for (const evidence of list) {
        if (evidence.type !== 'photo' || !evidence.remoteUrl) continue
        if (evidence.id in resolvedEvidenceUrls) continue
        resolvedEvidenceUrls[evidence.id] = ''
        storageService
          .resolveDownloadUrl(evidence.remoteUrl)
          .then((url) => (resolvedEvidenceUrls[evidence.id] = url))
          .catch(() => {})
      }
    }
  },
  { deep: true, immediate: true },
)
function evidenceThumbUrl(evidence: VerificationEvidence): string | undefined {
  return resolvedEvidenceUrls[evidence.id] || evidence.localUri || undefined
}
const photoPopoverKey = ref<string | null>(null)
function togglePhotoPopover(key: string): void {
  photoPopoverKey.value = photoPopoverKey.value === key ? null : key
}
// 買家複驗：拍好的照片可以直接帶進 AI 詢問小視窗 (ai-chat.store.ts).
const aiChat = useAiChatStore()
function latestPhoto(key: string): VerificationEvidence | undefined {
  return [...evidenceFor(key)].sort((a, b) => b.createdAt - a.createdAt)[0]
}
function canAskAi(key: string): boolean {
  return (
    !props.previewMode && verificationStore.flowKind === 'buyer' && !!latestPhoto(key)?.remoteUrl
  )
}
function askAiAboutPhoto(key: string): void {
  const photo = latestPhoto(key)
  const preview = photo ? evidenceThumbUrl(photo) : undefined
  if (!photo?.remoteUrl || !preview) return
  photoPopoverKey.value = null
  aiChat.askAboutEvidencePhoto(photo.remoteUrl, preview)
}
function retakePhoto(key: string): void {
  photoPopoverKey.value = null
  if (!props.previewMode) issuePhotoKey.value = key
}
/** Each item keeps exactly ONE photo — whichever way the camera was opened
 *  (long-press 相機 or 重新拍攝), the newly captured photo replaces every
 *  older one (deleted from Firestore + Storage too). Runs only after the new
 *  photo is saved, so cancelling the camera never loses the existing one. */
async function handleIssuePhotoCaptured(): Promise<void> {
  const key = issuePhotoKey.value
  closeIssuePhoto()
  if (!key) return
  const itemId = basicHealthCheckItemId(key)
  const photos = [...evidenceFor(key)].sort((a, b) => a.createdAt - b.createdAt)
  for (const old of photos.slice(0, -1)) {
    await verificationStore.removeEvidence(itemId, old.id).catch(() => {})
  }
}
function issuePhotoLabel(key: string): string {
  return tItem(basicHealthCheckItemId(key), ITEMS.value.find((it) => it.key === key)?.label ?? key)
}

// Hydrate from whatever this verification already has saved (revisiting the
// tab, or resuming a draft) — without this, reopening the tab would silently
// wipe every prior tap back to 尚未確認 even though it's already persisted.
// Skipped entirely in previewMode (HealthCheckAnnotationPreview.vue), which
// has no real verification/answers to read.
if (!props.previewMode) {
  for (const key of ALL_ITEM_KEYS) {
    const existing = verificationStore.answers[basicHealthCheckItemId(key)]
    if (!existing) continue
    if (existing.result === 'normal') state[key] = 'pass'
    else if (existing.result === 'attention') state[key] = 'fail'
    if (NOTE_BY_KEY.has(key) && existing.note) notes[key] = existing.note
  }
}

/** Re-saves 其他改裝品's note against whatever result is already on file —
 *  called on textarea blur rather than every keystroke. No-op while
 *  unanswered (the textarea itself is hidden until then — see the
 *  note-card's v-if below). */
function saveNote(key: string): void {
  const current = state[key]
  if (current) saveResult(key, current)
}

const PAGE_COUNT = 2
const currentPage = ref<1 | 2>(1)
const finished = ref(false)

const pageItems = computed(() => ITEMS.value.filter((it) => it.page === currentPage.value))
const isMirrored = computed(() => currentPage.value === 2)

const doneCount = computed(() => ITEMS.value.filter((it) => state[it.key] !== undefined).length)
const progressPercent = computed(() =>
  ITEMS.value.length > 0 ? (doneCount.value / ITEMS.value.length) * 100 : 0,
)

const allRequiredDone = computed(
  () =>
    ITEMS.value.length > 0 &&
    ITEMS.value.filter((it) => it.required).every((it) => state[it.key] !== undefined),
)

function goPage(delta: number): void {
  const next = currentPage.value + delta
  if (next < 1 || next > PAGE_COUNT) return
  currentPage.value = next as 1 | 2
}

function finish(): void {
  finished.value = true
}

const pickerAnchor = computed<[number, number]>(() => {
  const found = pageItems.value.find((it) => it.key === pickerKey.value)
  return found ? found.anchor : [50, 50]
})
</script>

<template>
  <div>
    <AppHeader
      v-if="!embedded"
      :title="t('basicCheck', 'title')"
      :back="!previewMode"
      custom-back
      @back="emit('back')"
    />

    <div v-if="loadingModel" class="content">
      <p class="intro">{{ t('ui', 'loading') }}</p>
    </div>

    <div v-else-if="notAnnotated" class="content">
      <div class="empty-state">
        <p>{{ t('basicCheck', 'notAnnotated') }}</p>
        <PrimaryButton v-if="!previewMode" block @click="emit('back')">{{
          t('ui', 'back')
        }}</PrimaryButton>
      </div>
    </div>

    <div v-else class="content">
      <p class="intro">
        {{ t('basicCheck', 'intro') }}
      </p>

      <div class="bike-card">
        <div class="bike-img-wrap" :class="{ mirrored: isMirrored }">
          <div class="bike-photo">
            <img :src="photoUrl" class="bike-illustration" :alt="t('basicCheck', 'photoAlt')" />
          </div>
          <button
            v-for="it in pageItems"
            :key="it.key"
            class="chip"
            :class="[
              it.anchor[0] < 50 ? 'side-left' : 'side-right',
              {
                required: it.required && state[it.key] === undefined,
                pass: state[it.key] === 'pass',
                fail: state[it.key] === 'fail',
              },
            ]"
            :style="{ left: it.anchor[0] + '%', top: it.anchor[1] + '%' }"
            @pointerdown="handleItemPointerDown(it.key)"
            @pointerup="handlePointerUpOrLeave"
            @pointerleave="handlePointerUpOrLeave"
            @pointercancel="handlePointerUpOrLeave"
            @contextmenu.prevent
            @click="handleClick(it.key)"
          >
            <span class="dot">
              <Check v-if="state[it.key] === 'pass'" :size="11" />
              <X v-else-if="state[it.key] === 'fail'" :size="11" />
            </span>
            <span class="label">{{ tItem(basicHealthCheckItemId(it.key), it.label) }}</span>
          </button>

          <div
            v-if="pickerKey"
            class="picker-backdrop"
            @click="closePicker"
            @touchstart.prevent="closePicker"
          />
          <div
            v-if="pickerKey"
            class="reaction-picker"
            :style="{ left: pickerAnchor[0] + '%', top: pickerAnchor[1] + '%' }"
          >
            <button
              class="reaction-btn pass"
              :aria-label="t('basicCheck', 'pickPass')"
              @click="pick(pickerKey, 'pass')"
            >
              <Check :size="18" />
            </button>
            <button
              class="reaction-btn fail"
              :aria-label="t('basicCheck', 'pickFail')"
              @click="pick(pickerKey, 'fail')"
            >
              <X :size="18" />
            </button>
            <button
              class="reaction-btn camera"
              :aria-label="t('basicCheck', 'pickCamera')"
              @click="openIssuePhoto(pickerKey)"
            >
              <Camera :size="18" />
            </button>
          </div>
        </div>

        <div class="page-nav">
          <button
            :disabled="currentPage === 1"
            :aria-label="t('basicCheck', 'prevPage')"
            @click="goPage(-1)"
          >
            ‹
          </button>
          <span class="count">{{ currentPage }} / {{ PAGE_COUNT }}</span>
          <button
            :disabled="currentPage === PAGE_COUNT"
            :aria-label="t('basicCheck', 'nextPage')"
            @click="goPage(1)"
          >
            ›
          </button>
        </div>

        <div class="result-list">
          <template v-for="it in pageItems" :key="it.key">
            <div
              class="result-row"
              :class="{ pass: state[it.key] === 'pass', fail: state[it.key] === 'fail' }"
              @pointerdown="handleItemPointerDown(it.key)"
              @pointerup="handlePointerUpOrLeave"
              @pointerleave="handlePointerUpOrLeave"
              @pointercancel="handlePointerUpOrLeave"
              @contextmenu.prevent
              @click="handleClick(it.key)"
            >
              <span class="result-label"
                >{{ tItem(basicHealthCheckItemId(it.key), it.label)
                }}<span v-if="it.required" class="req-mark">＊</span></span
              >
              <span class="result-status">
                <template v-if="state[it.key] === 'pass'"
                  ><Check :size="13" />{{ t('ui', 'pass') }}</template
                >
                <template v-else-if="state[it.key] === 'fail'"
                  ><X :size="13" />{{ t('ui', 'fail') }}</template
                >
                <template v-else>{{ t('ui', 'pending') }}</template>
                <button
                  v-if="evidenceFor(it.key).length > 0"
                  type="button"
                  class="photo-indicator"
                  :class="{ active: photoPopoverKey === it.key }"
                  :aria-label="t('basicCheck', 'viewPhoto')"
                  @pointerdown.stop
                  @click.stop="togglePhotoPopover(it.key)"
                >
                  <Camera :size="15" />
                </button>
              </span>
            </div>
            <Transition name="note-pop">
              <div v-if="photoPopoverKey === it.key" class="photo-popover" @click.stop>
                <div class="photo-popover-grid">
                  <img
                    v-for="evidence in evidenceFor(it.key)"
                    :key="evidence.id"
                    :src="evidenceThumbUrl(evidence)"
                    :alt="t('basicCheck', 'viewPhoto')"
                  />
                </div>
                <div class="photo-popover-actions">
                  <button type="button" class="retake-btn" @click="retakePhoto(it.key)">
                    <RotateCcw :size="14" /> {{ t('basicCheck', 'retakePhoto') }}
                  </button>
                  <button
                    v-if="canAskAi(it.key)"
                    type="button"
                    class="retake-btn ask-ai-btn"
                    @click="askAiAboutPhoto(it.key)"
                  >
                    <MessageCircle :size="14" /> {{ t('aiChat', 'askAboutPhoto') }}
                  </button>
                </div>
              </div>
            </Transition>
            <Transition name="note-pop">
              <div v-if="NOTE_BY_KEY.has(it.key) && state[it.key] !== undefined" class="note-card">
                <label>{{ t('basicCheck', 'otherModLabel') }}</label>
                <textarea
                  v-model="notes[it.key]"
                  :placeholder="t('basicCheck', 'otherModPlaceholder')"
                  @blur="saveNote(it.key)"
                />
              </div>
            </Transition>
          </template>
        </div>
      </div>

      <div class="progress-card">
        <div class="progress-head">
          <span>{{ t('basicCheck', 'progress') }}</span>
          <span class="progress-count"
            >{{ doneCount }}<span class="of">/{{ ITEMS.length }}</span></span
          >
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
      </div>
    </div>

    <div v-if="!previewMode && !loadingModel && !notAnnotated" class="bottom-bar">
      <PrimaryButton v-if="!finished" block :disabled="!allRequiredDone" @click="finish">
        {{ t('basicCheck', 'finish') }}
      </PrimaryButton>
      <template v-else>
        <p class="done-message">{{ t('basicCheck', 'finished') }}</p>
        <PrimaryButton block @click="emit('advance')">{{ t('ui', 'next') }}</PrimaryButton>
      </template>
    </div>

    <HealthCheckIssuePhotoCapture
      v-if="issuePhotoKey && verificationStore.currentVerification"
      :verification-id="verificationStore.currentVerification.id"
      :item-key="issuePhotoKey"
      :item-label="issuePhotoLabel(issuePhotoKey)"
      :vehicle-type="vehicleType"
      @captured="handleIssuePhotoCaptured"
      @skip="closeIssuePhoto"
    />

    <VerificationHelpSheet
      :open="knownIssueOpen"
      :title="knownIssueTitle"
      :content="knownIssueContent"
      @close="closeKnownIssue"
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
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
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

.chip.pass .dot {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}

.chip.fail .dot {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: #fff;
}

.picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3;
  background: transparent;
}

.reaction-picker {
  position: absolute;
  transform: translate(-50%, calc(-100% - 30px));
  display: flex;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 6px;
  box-shadow: 0 6px 20px rgba(20, 24, 31, 0.35);
  z-index: 4;
  animation: reaction-pop 0.12s ease-out;
}

@keyframes reaction-pop {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-100% - 30px)) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, calc(-100% - 30px)) scale(1);
  }
}

.reaction-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: transform 0.1s ease;
}

.reaction-btn:active {
  transform: scale(1.15);
}

.reaction-btn.pass {
  background: var(--color-success);
}

.reaction-btn.fail {
  background: var(--color-danger);
}

.reaction-btn.camera {
  background: var(--color-warning, #f5b100);
  color: #14181f;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
}

.result-row:last-child {
  border-bottom: none;
}

.result-label {
  font-size: 13px;
  color: var(--color-text-primary);
}

.req-mark {
  color: var(--color-warning);
  margin-left: 2px;
}

.result-status {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-disabled);
}

.photo-indicator {
  width: 26px;
  height: 26px;
  margin-left: 6px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-warning-bg, #fff4d6);
  color: var(--color-warning, #b45309);
  cursor: pointer;
}

.photo-indicator.active {
  background: var(--color-warning, #f5b100);
  color: #14181f;
}

/* Tooltip-style card under the row, arrow pointing at the camera icon. */
.photo-popover {
  position: relative;
  align-self: flex-end;
  width: min(260px, 100%);
  margin: 2px 0 8px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 6px 20px rgba(20, 24, 31, 0.18);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transform-origin: top right;
}

.photo-popover::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 12px;
  width: 10px;
  height: 10px;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  border-top: 1px solid var(--color-border);
  transform: rotate(45deg);
}

.photo-popover-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.photo-popover-grid img {
  width: 100%;
  max-height: 200px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-background);
}

.retake-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.photo-popover-actions {
  display: flex;
  gap: 8px;
}

.photo-popover-actions .retake-btn {
  flex: 1;
}

.ask-ai-btn {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.result-row.pass .result-status {
  color: var(--color-success);
}

.result-row.fail .result-status {
  color: var(--color-danger);
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

.note-card {
  background: var(--color-primary-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  margin: 4px 0 8px;
  transform-origin: top center;
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

/* "彈出" pop-in feel, matching the reaction-picker's own animation style —
   note appears right under its item's row the instant it's checked. */
.note-pop-enter-active {
  animation: note-pop-in 0.16s ease-out;
}
.note-pop-leave-active {
  animation: note-pop-in 0.12s ease-in reverse;
}
@keyframes note-pop-in {
  from {
    opacity: 0;
    transform: scaleY(0.85) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scaleY(1) translateY(0);
  }
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
