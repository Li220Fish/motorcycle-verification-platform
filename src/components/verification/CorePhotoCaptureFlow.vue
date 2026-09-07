<script setup lang="ts">
/**
 * Full-screen, camera-app-style capture for ALL 7 required core photo items
 * at once (車輛左側/右側/車尾/儀表板/前避震/引擎底部/傳動鏈條) — ONE continuous
 * live-camera session for the whole group, replacing the earlier per-item
 * LiveCameraCapture.vue (which closed and reopened the camera between every
 * single shot — explicit user feedback: "每次拍完照畫面會跳掉再重開，UI 體驗
 * 很差"). The camera opens once on mount and never closes until the user
 * leaves this screen; a filmstrip along the bottom lists all 7 items
 * (captured or not) and picks which one the next shutter tap targets —
 * tapping an already-captured item selects it for an in-place retake
 * without navigating anywhere or dropping the camera.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Check, ChevronLeft, Flashlight, MessageSquare, X } from 'lucide-vue-next'

import {
  liveCameraService,
  type CameraFacing,
  type TorchCapabilities,
  type TorchConstraintSet,
} from '@/services/media/live-camera.service'
import { storageService } from '@/services/firebase/storage.service'
import { useUploadQueueStore } from '@/stores/upload-queue.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = defineProps<{ verificationId: string; initialItemId?: string }>()
defineEmits<{ advance: []; back: [] }>()

const verificationStore = useVerificationStore()
const uploadQueueStore = useUploadQueueStore()

// 引擎底部通常要把手機塞到車身底下拍，用前鏡頭（螢幕同側）比較好對準——目前
// 唯一需要跟其他 6 項核心照片（後鏡頭）不同鏡頭的項目。Hardcoded to this one
// stable business-key id rather than a new schema field, matching how this
// codebase already special-cases one-off items elsewhere (e.g.
// VerificationStepsView.vue's `isColdTouchSession` checking `item.id ===
// 'ENG-02'` directly).
const FRONT_CAMERA_ITEM_ID = 'APR-engine-bottom'
function facingModeFor(itemId: string): CameraFacing {
  return itemId === FRONT_CAMERA_ITEM_ID ? 'user' : 'environment'
}

interface CoreItem {
  id: string
  title: string
}

const coreItems = computed<CoreItem[]>(() =>
  verificationStore.flatItems
    .filter((flat) => flat.item.type === 'photo' && flat.item.required)
    .map((flat) => ({ id: flat.item.id, title: flat.item.title })),
)

function firstEvidenceFor(itemId: string): VerificationEvidence | undefined {
  return verificationStore.evidenceByItem[itemId]?.[0]
}

// Older evidence (loaded from Firestore across sessions, no localUri left)
// only has `remoteUrl` — a Storage object PATH, not a directly-usable URL
// (see storage.service.ts's uploadPrivateFile doc comment) — resolve it the
// same way EvidencePreview.vue already does for its own thumbnail tiles.
const resolvedThumbUrls = reactive<Record<string, string>>({})
watch(
  () => verificationStore.evidenceByItem,
  (byItem) => {
    for (const list of Object.values(byItem)) {
      for (const evidence of list) {
        if (
          evidence.type === 'photo' &&
          evidence.remoteUrl &&
          !evidence.localUri &&
          !(evidence.id in resolvedThumbUrls)
        ) {
          storageService
            .resolveDownloadUrl(evidence.remoteUrl)
            .then((url) => {
              resolvedThumbUrls[evidence.id] = url
            })
            .catch(() => {})
        }
      }
    }
  },
  { deep: true, immediate: true },
)

function thumbnailFor(itemId: string): string | undefined {
  const evidence = firstEvidenceFor(itemId)
  if (!evidence) return undefined
  return resolvedThumbUrls[evidence.id] ?? evidence.localUri
}

function firstUncapturedItemId(): string | undefined {
  return coreItems.value.find((item) => !firstEvidenceFor(item.id))?.id
}

const selectedItemId = ref('')
const selectedItem = computed(() =>
  coreItems.value.find((item) => item.id === selectedItemId.value),
)
const allCaptured = computed(
  () => coreItems.value.length > 0 && coreItems.value.every((item) => !!firstEvidenceFor(item.id)),
)

function selectItem(itemId: string): void {
  selectedItemId.value = itemId
  const nextFacing = facingModeFor(itemId)
  if (nextFacing !== currentFacingMode.value) void startCamera(nextFacing)
}

function initSelection(): void {
  const initial = props.initialItemId
  if (
    initial &&
    coreItems.value.some((item) => item.id === initial) &&
    !firstEvidenceFor(initial)
  ) {
    selectedItemId.value = initial
    return
  }
  selectedItemId.value = firstUncapturedItemId() ?? coreItems.value[0]?.id ?? ''
}

type Phase = 'requesting' | 'live' | 'denied'
const phase = ref<Phase>('requesting')
const errorMessage = ref('')
const previewEl = ref<HTMLVideoElement | null>(null)
const flashing = ref(false)
const torchSupported = ref(false)
const torchOn = ref(false)
const currentFacingMode = ref<CameraFacing>('environment')

function checkTorchSupport(track: MediaStreamTrack): boolean {
  const capabilities = track.getCapabilities?.() as TorchCapabilities | undefined
  return !!capabilities?.torch
}

async function setTorch(on: boolean): Promise<void> {
  const track = liveCameraService.getVideoTrack()
  if (!track || !torchSupported.value) return
  try {
    const constraint: TorchConstraintSet = { torch: on }
    await track.applyConstraints({ advanced: [constraint] })
    torchOn.value = on
  } catch (error) {
    console.error('[CorePhotoCaptureFlow] torch toggle failed:', error)
  }
}

async function startCamera(facingMode: CameraFacing = currentFacingMode.value): Promise<void> {
  phase.value = 'requesting'
  errorMessage.value = ''
  try {
    const stream = await liveCameraService.start(facingMode)
    currentFacingMode.value = facingMode
    phase.value = 'live'
    await nextTick()
    if (previewEl.value) previewEl.value.srcObject = stream
    const track = liveCameraService.getVideoTrack()
    torchOn.value = false
    torchSupported.value = !!track && checkTorchSupport(track)
    // 進入相機時預設閃光燈（手電筒）常亮，不用每次手動點。
    if (torchSupported.value) void setTorch(true)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : ''
    phase.value = 'denied'
  }
}

function toggleTorch(): void {
  void setTorch(!torchOn.value)
}

function flashShutter(): void {
  flashing.value = true
  setTimeout(() => {
    flashing.value = false
  }, 150)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 前鏡頭（引擎底部專用）沒有實體補光燈，模仿 iPhone 自拍閃光燈：拍照時整個螢幕
// 變全白當作光源。留一段時間（跟真的 iPhone 一樣）讓螢幕先亮起來、光線有機會
// 照到拍攝物再擷取影格，不然拍下的畫面根本還沒變亮，這段白屏就只是好看而已。
const FRONT_FLASH_MS = 250
const frontFlashActive = ref(false)

async function capturePhoto(): Promise<void> {
  if (phase.value !== 'live' || !previewEl.value || !selectedItemId.value) return
  const targetItemId = selectedItemId.value
  const video = previewEl.value

  const usingFrontCamera = currentFacingMode.value === 'user'
  if (usingFrontCamera) {
    frontFlashActive.value = true
    await sleep(FRONT_FLASH_MS)
  }

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    frontFlashActive.value = false
    return
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  })
  frontFlashActive.value = false
  if (!blob) return
  // The front camera's sustained white screen already reads as its own
  // flash — the normal brief blink is for the back camera's physical torch
  // shots and would just look like a redundant double-flash here.
  if (!usingFrontCamera) flashShutter()

  // Retaking an already-captured item replaces it in place — only ever one
  // photo per core item slot, never accumulating duplicates behind it.
  for (const existing of verificationStore.evidenceByItem[targetItemId] ?? []) {
    verificationStore.removeEvidenceLocally(targetItemId, existing.id)
  }

  const evidenceId = crypto.randomUUID()
  const evidence: VerificationEvidence = {
    id: evidenceId,
    verificationId: props.verificationId,
    itemId: targetItemId,
    type: 'photo',
    localUri: URL.createObjectURL(blob),
    createdAt: Date.now(),
    captureSource: 'camera',
    captureTimestamp: Date.now(),
  }
  await verificationStore.addEvidence(evidence)
  void uploadQueueStore.enqueue({
    localId: evidenceId,
    verificationId: props.verificationId,
    itemId: targetItemId,
    type: 'photo',
    blob,
    extension: 'jpg',
  })
  void verificationStore.saveAnswer(targetItemId, 'normal')

  // Camera stays open — just move the selection on to whatever's still
  // missing, if anything. Once every item has a photo the 完成 button
  // appears (top-right) instead of forcing an immediate exit, so a just-
  // taken shot's flash/thumbnail is still visible for a moment.
  // Routed through selectItem() rather than a direct assignment — it's the
  // one place that also switches the camera when the auto-advance lands on
  // 引擎底部 (front camera). A plain `selectedItemId.value = next` here was
  // the bug: auto-advancing onto that item left the BACK camera running,
  // and only a manual tap on its thumbnail ever triggered the front-camera
  // switch — so it could silently get shot with the wrong camera.
  const next = firstUncapturedItemId()
  if (next) selectItem(next)
}

// 長按底下的小照片可以幫該項目加備註——用 pointerdown/up 手動計時，而不是
// contextmenu/長按原生事件，因為手機瀏覽器的長按通常會觸發選取/系統選單而非
// 一個乾淨的自訂事件。長按成功後要吃掉緊接著的 click，不然放開手指還是會被
// 當成一次「切換項目」的點擊。
const LONG_PRESS_MS = 500
let longPressTimer: ReturnType<typeof setTimeout> | undefined
let longPressTriggered = false
const noteTargetItemId = ref<string | null>(null)
const noteDraft = ref('')

function handleThumbPointerDown(itemId: string): void {
  longPressTriggered = false
  longPressTimer = setTimeout(() => {
    longPressTriggered = true
    openNoteEditor(itemId)
  }, LONG_PRESS_MS)
}

function clearLongPressTimer(): void {
  if (longPressTimer !== undefined) {
    clearTimeout(longPressTimer)
    longPressTimer = undefined
  }
}

function handleThumbPointerUp(): void {
  clearLongPressTimer()
}

function handleThumbClick(itemId: string): void {
  if (longPressTriggered) {
    longPressTriggered = false
    return
  }
  selectItem(itemId)
}

function openNoteEditor(itemId: string): void {
  noteTargetItemId.value = itemId
  noteDraft.value = verificationStore.answers[itemId]?.note ?? ''
}

function closeNoteEditor(): void {
  noteTargetItemId.value = null
  noteDraft.value = ''
}

function saveNote(): void {
  const itemId = noteTargetItemId.value
  if (!itemId) return
  const currentResult = verificationStore.answers[itemId]?.result ?? 'normal'
  void verificationStore.saveAnswer(itemId, currentResult, noteDraft.value || undefined)
  closeNoteEditor()
}

onMounted(() => {
  initSelection()
  void startCamera(facingModeFor(selectedItemId.value))
})
onBeforeUnmount(() => {
  liveCameraService.stop()
  clearLongPressTimer()
})
</script>

<template>
  <Teleport to="body">
    <div class="core-photo-capture">
      <video
        v-if="phase === 'live'"
        ref="previewEl"
        autoplay
        muted
        playsinline
        class="camera-feed"
      />
      <div v-else class="camera-placeholder">
        <p v-if="phase === 'requesting'" class="placeholder-text">準備相機中...</p>
        <template v-else>
          <p class="placeholder-text">需要相機權限才能拍攝</p>
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
          <button class="retry-btn" @click="startCamera()">重試</button>
        </template>
      </div>

      <Transition name="flash-fade">
        <div v-if="flashing" class="shutter-flash" />
      </Transition>
      <div v-if="frontFlashActive" class="front-flash" />

      <div class="top-overlay">
        <button class="back-btn" aria-label="返回" @click="$emit('back')">
          <ChevronLeft :size="22" />
        </button>
        <div class="top-titles">
          <p class="top-title">{{ selectedItem?.title ?? '核心照片' }}</p>
          <p class="top-subtitle">請讓{{ selectedItem?.title }}完整入框</p>
        </div>
        <button v-if="allCaptured" class="done-btn" @click="$emit('advance')">
          <Check :size="16" /> 完成
        </button>
      </div>

      <div class="bottom-overlay">
        <div class="filmstrip">
          <button
            v-for="coreItem in coreItems"
            :key="coreItem.id"
            class="filmstrip-thumb-btn"
            :class="{ selected: coreItem.id === selectedItemId }"
            aria-label="選擇項目，長按可加備註"
            @pointerdown="handleThumbPointerDown(coreItem.id)"
            @pointerup="handleThumbPointerUp"
            @pointerleave="handleThumbPointerUp"
            @pointercancel="handleThumbPointerUp"
            @click="handleThumbClick(coreItem.id)"
          >
            <img
              v-if="thumbnailFor(coreItem.id)"
              :src="thumbnailFor(coreItem.id)"
              class="filmstrip-thumb"
              alt=""
            />
            <span v-else class="filmstrip-placeholder">{{ coreItem.title }}</span>
            <span v-if="verificationStore.answers[coreItem.id]?.note" class="filmstrip-note-badge">
              <MessageSquare :size="12" />
            </span>
          </button>
        </div>
        <div class="shutter-row">
          <button
            class="torch-btn"
            :class="{ on: torchOn }"
            :disabled="!torchSupported"
            aria-label="開關手電筒"
            @click="toggleTorch"
          >
            <Flashlight :size="20" />
          </button>
          <button
            class="shutter-btn"
            :disabled="phase !== 'live'"
            aria-label="拍照"
            @click="capturePhoto"
          >
            <span class="shutter-inner" />
          </button>
          <div class="shutter-spacer"></div>
        </div>
      </div>

      <div v-if="noteTargetItemId" class="note-overlay" @click.self="closeNoteEditor">
        <div class="note-card">
          <div class="note-header">
            <p class="note-title">
              {{ coreItems.find((item) => item.id === noteTargetItemId)?.title }}備註
            </p>
            <button class="note-close-btn" aria-label="關閉" @click="closeNoteEditor">
              <X :size="18" />
            </button>
          </div>
          <textarea
            v-model="noteDraft"
            class="note-textarea"
            rows="4"
            placeholder="針對這張照片補充說明..."
          />
          <div class="note-actions">
            <button class="note-cancel-btn" @click="closeNoteEditor">取消</button>
            <button class="note-save-btn" @click="saveNote">儲存</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.core-photo-capture {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: #000;
  overflow: hidden;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}

.camera-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
}

.placeholder-text {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.error-text {
  color: #f87171;
  font-size: 12px;
  text-align: center;
}

.retry-btn {
  padding: 8px 20px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: transparent;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.shutter-flash {
  position: absolute;
  inset: 0;
  background: #fff;
  pointer-events: none;
}

/* No fade in/out, unlike .shutter-flash — this is standing in for a physical
   flash lighting the subject, so it needs to snap to full brightness
   immediately rather than easing in. */
.front-flash {
  position: absolute;
  inset: 0;
  z-index: 320;
  background: #fff;
  pointer-events: none;
}

.flash-fade-enter-active,
.flash-fade-leave-active {
  transition: opacity 0.2s ease;
}

.flash-fade-enter-from,
.flash-fade-leave-to {
  opacity: 0;
}

.top-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: calc(var(--space-md) + env(safe-area-inset-top)) var(--space-md) var(--space-lg);
  background: linear-gradient(rgba(0, 0, 0, 0.55), transparent);
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.back-btn {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  margin-top: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.top-titles {
  flex: 1;
  min-width: 0;
}

.top-title {
  margin: 0;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
}

.top-subtitle {
  margin: 2px 0 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.done-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: var(--radius-md);
  padding: 8px 16px;
  background: #fff;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 700;
}

.bottom-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--space-md) var(--space-md) calc(var(--space-lg) + env(safe-area-inset-bottom));
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.filmstrip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.filmstrip-thumb-btn {
  position: relative;
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.filmstrip-thumb-btn.selected {
  border-color: var(--color-primary);
  border-width: 3px;
}

.filmstrip-note-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filmstrip-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.filmstrip-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  font-size: 10px;
  line-height: 1.2;
  text-align: center;
  color: rgba(255, 255, 255, 0.75);
}

.shutter-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
}

.torch-btn,
.shutter-spacer {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
}

.torch-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.torch-btn.on {
  background: #fff;
  color: #b45309;
}

.torch-btn:disabled {
  opacity: 0.35;
}

.shutter-btn {
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  border: 4px solid #fff;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shutter-btn:disabled {
  opacity: 0.5;
}

.shutter-inner {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: #fff;
}

.note-overlay {
  position: absolute;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: rgba(0, 0, 0, 0.5);
}

.note-card {
  width: 100%;
  max-width: 320px;
  border-radius: var(--radius-lg);
  background: #fff;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.note-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.note-close-btn {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: var(--color-bg-subtle, #f1f5f9);
  color: var(--color-text-secondary);
}

.note-textarea {
  width: 100%;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary);
  resize: vertical;
}

.note-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.note-cancel-btn,
.note-save-btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: none;
  font-size: 14px;
  font-weight: 700;
}

.note-cancel-btn {
  background: var(--color-bg-subtle, #f1f5f9);
  color: var(--color-text-secondary);
}

.note-save-btn {
  background: var(--color-primary);
  color: #fff;
}
</style>
