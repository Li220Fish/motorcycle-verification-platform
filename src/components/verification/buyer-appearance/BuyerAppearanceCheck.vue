<script setup lang="ts">
/**
 * 買家複驗「車輛外觀檢測」的 7 個動畫引導項目 (BUYER-APP-*) — ported from the
 * approved ride-buyer-inspection.html: per item, screen 1 loops a guide
 * animation, screen 2 shows its freeze frame above a 正常/異常/不確定 sheet
 * (note required for 異常). Answers save like any checklist item
 * (ok→normal, bad→attention, unsure→unsure). Added on top of the original
 * design: an optional photo per item (one photo, a retake replaces it) with
 * a 「詢問 AI」 shortcut into the AI chat window.
 *
 * Full-screen (teleported) like CorePhotoCaptureFlow.vue, so the design's
 * edge-to-edge animation isn't squeezed under the verification header.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Camera, ChevronLeft, MessageCircle, RotateCcw, X } from 'lucide-vue-next'

import { useI18n } from '@/composables/useI18n'
import {
  BUYER_APPEARANCE_ITEM_DEFS,
  buyerAppearanceItemId,
  type AppearanceItemText,
} from '@/data/verification/buyer-appearance-items'
import { storageService } from '@/services/firebase/storage.service'
import { imageCompressionService } from '@/services/media/image-compression.service'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { AnswerResultValue, VerificationEvidence } from '@/types/verification-evidence'
import { mountAppearanceAnim, type AppearanceAnimInstance } from './appearance-anims'

const props = defineProps<{ verificationId: string; initialItemId?: string }>()
const emit = defineEmits<{ advance: []; back: [] }>()

const { t, isEnglish } = useI18n()
const verificationStore = useVerificationStore()
const aiChat = useAiChatStore()

type Choice = 'ok' | 'bad' | 'unsure'
const CHOICE_TO_RESULT: Record<Choice, AnswerResultValue> = {
  ok: 'normal',
  bad: 'attention',
  unsure: 'unsure',
}
const RESULT_TO_CHOICE: Partial<Record<AnswerResultValue, Choice>> = {
  normal: 'ok',
  attention: 'bad',
  unsure: 'unsure',
}
const CHOICES: Choice[] = ['ok', 'bad', 'unsure']

const items = BUYER_APPEARANCE_ITEM_DEFS
const itemIdAt = (i: number) => buyerAppearanceItemId(items[i].key)
const answered = (i: number) => !!verificationStore.answers[itemIdAt(i)]

function startIndex(): number {
  const fromProp = items.findIndex((def) => buyerAppearanceItemId(def.key) === props.initialItemId)
  if (fromProp !== -1 && !answered(fromProp)) return fromProp
  const firstOpen = items.findIndex((_, i) => !answered(i))
  return firstOpen !== -1 ? firstOpen : Math.max(fromProp, 0)
}

const idx = ref(startIndex())
const screen = ref<'anim' | 'check'>('anim')
const text = computed<AppearanceItemText>(() =>
  isEnglish() ? items[idx.value].en : items[idx.value].zh,
)
const itemId = computed(() => itemIdAt(idx.value))

// ---------- animation ----------
const reduceMotion =
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const animHost = ref<HTMLElement | null>(null)
const freezeHost = ref<HTMLElement | null>(null)
let anim: AppearanceAnimInstance | null = null
const loopProgress = ref(0)
const watchedOnce = ref(false)
const replaying = ref(false)

function stopAnim(): void {
  anim?.stop()
  anim = null
}

async function openAnim(): Promise<void> {
  screen.value = 'anim'
  watchedOnce.value = false
  loopProgress.value = 0
  stopAnim()
  await nextTick()
  if (!animHost.value) return
  anim = mountAppearanceAnim(animHost.value, items[idx.value].key, 'meet')
  if (reduceMotion) {
    anim.still()
    watchedOnce.value = true
    loopProgress.value = 1
  } else {
    anim.loop((elapsed, total) => {
      loopProgress.value = Math.min(elapsed / total, 1)
      if (elapsed >= total) watchedOnce.value = true
    })
  }
}

async function openCheck(): Promise<void> {
  screen.value = 'check'
  stopAnim()
  hydrateForm()
  await nextTick()
  if (!freezeHost.value) return
  anim = mountAppearanceAnim(freezeHost.value, items[idx.value].key, 'fill')
  anim.still()
}

function replay(): void {
  if (reduceMotion || !anim) return
  replaying.value = true
  anim.playOnce(() => (replaying.value = false))
}

// ---------- check form ----------
const choice = ref<Choice | null>(null)
const note = ref('')
const noteTouched = ref(false)

function hydrateForm(): void {
  const saved = verificationStore.answers[itemId.value]
  choice.value = saved ? (RESULT_TO_CHOICE[saved.result] ?? null) : null
  note.value = saved?.note ?? ''
  noteTouched.value = false
}

const noteRequired = computed(() => choice.value === 'bad')
const noteMissing = computed(() => noteRequired.value && !note.value.trim())
const canFinishItem = computed(() => !!choice.value && !noteMissing.value)
const isLastOpen = computed(() => items.every((_, i) => i === idx.value || answered(i)))

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
let advanceTimer: ReturnType<typeof setTimeout> | null = null

async function finishItem(): Promise<void> {
  if (!choice.value || noteMissing.value) return
  await verificationStore.saveAnswer(
    itemId.value,
    CHOICE_TO_RESULT[choice.value],
    note.value.trim() || undefined,
  )
  toast.value = t('buyerAppearance', 'recorded', { result: t('buyerAppearance', choice.value) })
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1200)
  advanceTimer = setTimeout(() => {
    const next = items.findIndex((_, i) => i > idx.value && !answered(i))
    const anyOpen = items.findIndex((_, i) => !answered(i))
    if (next !== -1) {
      idx.value = next
      void openAnim()
    } else if (anyOpen !== -1) {
      idx.value = anyOpen
      void openAnim()
    } else {
      emit('advance')
    }
  }, 700)
}

// ---------- optional photo + 詢問 AI ----------
const fileInput = ref<HTMLInputElement | null>(null)
const uploadingPhoto = ref(false)
const photoError = ref('')
const localPreview = ref<Record<string, string>>({})
const resolvedUrls = ref<Record<string, string>>({})

const currentPhoto = computed<VerificationEvidence | undefined>(
  () =>
    (verificationStore.evidenceByItem[itemId.value] ?? [])
      .filter((evidence) => evidence.type === 'photo')
      .sort((a, b) => b.createdAt - a.createdAt)[0],
)
const currentPhotoUrl = computed(() => {
  const photo = currentPhoto.value
  if (!photo) return undefined
  return localPreview.value[photo.id] ?? resolvedUrls.value[photo.id] ?? photo.localUri
})
watch(
  currentPhoto,
  (photo) => {
    if (!photo?.remoteUrl || photo.id in resolvedUrls.value || photo.id in localPreview.value)
      return
    storageService
      .resolveDownloadUrl(photo.remoteUrl)
      .then((url) => (resolvedUrls.value = { ...resolvedUrls.value, [photo.id]: url }))
      .catch(() => {})
  },
  { immediate: true },
)

async function onPhotoPicked(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploadingPhoto.value = true
  photoError.value = ''
  try {
    const { blob } = await imageCompressionService.compressImage(file)
    const remoteUrl = await storageService.uploadEvidenceFile(
      props.verificationId,
      itemId.value,
      blob,
      'jpg',
    )
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId: itemId.value,
      type: 'photo',
      localUri: URL.createObjectURL(blob),
      remoteUrl,
      createdAt: Date.now(),
      captureSource: 'camera',
      captureTimestamp: Date.now(),
    }
    localPreview.value = { ...localPreview.value, [evidence.id]: evidence.localUri! }
    await verificationStore.addEvidence(evidence)
    // One photo per item — a retake replaces the old one everywhere.
    await verificationStore.discardOtherEvidence(itemId.value, evidence.id)
  } catch (error) {
    console.error('[BuyerAppearanceCheck] photo upload failed:', error)
    photoError.value = error instanceof Error ? error.message : String(error)
  } finally {
    uploadingPhoto.value = false
  }
}

function askAiAboutPhoto(): void {
  const photo = currentPhoto.value
  if (!photo?.remoteUrl || !currentPhotoUrl.value) return
  photoPopupOpen.value = false
  aiChat.askAboutEvidencePhoto(photo.remoteUrl, currentPhotoUrl.value)
}

// 選了「異常」或「不確定」→ 跳出拍照小視窗 (orange camera). Only on the
// user's own change, never when re-opening an item that was already answered.
const photoPopupOpen = ref(false)
const wantsPhoto = computed(() => choice.value === 'bad' || choice.value === 'unsure')
function onChoiceChanged(): void {
  if (wantsPhoto.value) photoPopupOpen.value = true
}
watch(idx, () => (photoPopupOpen.value = false))

// ---------- lifecycle ----------
onMounted(() => void openAnim())
onBeforeUnmount(() => {
  stopAnim()
  if (toastTimer) clearTimeout(toastTimer)
  if (advanceTimer) clearTimeout(advanceTimer)
})
</script>

<template>
  <Teleport to="body">
    <div class="buyer-appearance">
      <!-- 畫面 1：引導動畫 -->
      <section v-if="screen === 'anim'" class="ba-screen" :aria-label="text.title">
        <div class="ba-top">
          <button type="button" class="ba-icon" :aria-label="t('ui', 'back')" @click="emit('back')">
            <X :size="22" />
          </button>
          <div class="ba-prog" aria-hidden="true">
            <i
              v-for="(def, i) in items"
              :key="def.key"
              :class="{ cur: i === idx, done: i !== idx && answered(i) }"
            />
          </div>
          <button type="button" class="ba-skip" @click="openCheck">
            {{ t('buyerAppearance', 'skip') }}
          </button>
        </div>
        <div class="ba-head">
          <span class="ba-code">{{ text.code }}</span>
          <h2>{{ text.title }}</h2>
        </div>
        <div ref="animHost" class="host ba-anim" />
        <div class="ba-bottom">
          <div class="ba-loopbar" aria-hidden="true">
            <i :style="{ width: `${(loopProgress * 100).toFixed(1)}%` }" />
          </div>
          <button
            type="button"
            class="ba-cta"
            :data-ready="watchedOnce ? 'true' : 'false'"
            @click="openCheck"
          >
            {{ t('buyerAppearance', 'watched') }}
          </button>
        </div>
      </section>

      <!-- 畫面 2：定格畫面＋檢核 -->
      <section v-else class="ba-screen" :aria-label="text.title">
        <div class="ba-nav">
          <button
            type="button"
            class="ba-icon"
            :aria-label="t('buyerAppearance', 'backToAnim')"
            @click="openAnim"
          >
            <ChevronLeft :size="22" />
          </button>
          <h1>{{ text.title }}</h1>
          <span class="ba-count">{{ idx + 1 }}/{{ items.length }}</span>
        </div>
        <div class="ba-freeze">
          <div ref="freezeHost" class="host fill ba-freeze-host" />
          <button v-if="!replaying" type="button" class="ba-replay" @click="replay">
            <RotateCcw :size="14" />{{ t('buyerAppearance', 'replay') }}
          </button>
        </div>
        <div class="ba-sheet">
          <form class="ba-scroll" @submit.prevent>
            <div class="ba-q">
              <h3>{{ text.question }}</h3>
              <p>{{ text.hint }}</p>
            </div>
            <div
              class="ba-opts"
              role="radiogroup"
              :aria-label="t('buyerAppearance', 'resultsLabel')"
            >
              <label v-for="key in CHOICES" :key="key" class="ba-opt" :data-k="key">
                <input
                  v-model="choice"
                  type="radio"
                  name="ba-result"
                  :value="key"
                  @change="onChoiceChanged"
                />
                <i class="ba-dot" />
                <span>
                  <b>{{ t('buyerAppearance', key) }}</b>
                  <span class="d">{{ text[key] }}</span>
                </span>
              </label>
            </div>
            <div class="ba-note">
              <label for="ba-desc">
                {{ t('buyerAppearance', 'note') }}
                <small>{{
                  noteRequired ? t('buyerAppearance', 'required') : t('buyerAppearance', 'optional')
                }}</small>
              </label>
              <textarea
                id="ba-desc"
                v-model="note"
                :placeholder="text.placeholder[choice ?? 'ok']"
                @input="noteTouched = true"
                @blur="noteTouched = true"
              />
              <div v-if="noteMissing && noteTouched" class="ba-err">
                {{ t('buyerAppearance', 'noteRequired') }}
              </div>
            </div>

            <!-- 異常／不確定：重新打開拍照小視窗的入口（含已拍的縮圖） -->
            <div v-if="wantsPhoto || currentPhoto" class="ba-photo">
              <button
                type="button"
                class="ba-photo-open"
                :aria-label="t('buyerAppearance', 'photo')"
                @click="photoPopupOpen = true"
              >
                <img v-if="currentPhotoUrl" :src="currentPhotoUrl" alt="" class="ba-thumb" />
                <span v-else class="ba-cam-badge"><Camera :size="18" /></span>
                <span>{{
                  currentPhoto ? t('buyerAppearance', 'photoSaved') : t('buyerAppearance', 'photo')
                }}</span>
              </button>
            </div>
            <input
              ref="fileInput"
              class="ba-file"
              type="file"
              accept="image/*"
              capture="environment"
              @change="onPhotoPicked"
            />
          </form>
          <div class="ba-bar">
            <button type="button" class="ba-cta" :disabled="!canFinishItem" @click="finishItem">
              {{ isLastOpen ? t('buyerAppearance', 'finish') : t('buyerAppearance', 'next') }}
            </button>
          </div>
        </div>
        <div class="ba-toast" :class="{ show: !!toast }">{{ toast }}</div>

        <!-- 拍照小視窗 -->
        <div v-if="photoPopupOpen" class="ba-popup-backdrop" @click.self="photoPopupOpen = false">
          <div class="ba-popup" role="dialog" :aria-label="t('buyerAppearance', 'photoTitle')">
            <button
              type="button"
              class="ba-popup-close"
              :aria-label="t('buyerAppearance', 'close')"
              @click="photoPopupOpen = false"
            >
              <X :size="18" />
            </button>
            <p class="ba-popup-title">{{ t('buyerAppearance', 'photoTitle') }}</p>
            <p class="ba-popup-hint">{{ t('buyerAppearance', 'photoHint') }}</p>

            <template v-if="currentPhotoUrl">
              <img :src="currentPhotoUrl" alt="" class="ba-popup-img" />
              <div class="ba-popup-actions">
                <button
                  type="button"
                  class="ba-chip"
                  :disabled="uploadingPhoto"
                  @click="fileInput?.click()"
                >
                  <RotateCcw :size="14" />
                  {{ uploadingPhoto ? t('ui', 'loading') : t('buyerAppearance', 'retakePhoto') }}
                </button>
                <button
                  v-if="currentPhoto?.remoteUrl"
                  type="button"
                  class="ba-chip ai"
                  @click="askAiAboutPhoto"
                >
                  <MessageCircle :size="14" />
                  {{ t('aiChat', 'askAboutPhoto') }}
                </button>
              </div>
            </template>
            <button
              v-else
              type="button"
              class="ba-cam-btn"
              :aria-label="t('buyerAppearance', 'photo')"
              :disabled="uploadingPhoto"
              @click="fileInput?.click()"
            >
              <Camera :size="34" />
            </button>
            <p v-if="uploadingPhoto && !currentPhotoUrl" class="ba-popup-hint">
              {{ t('ui', 'loading') }}
            </p>
            <p v-if="photoError" class="ba-err">{{ photoError }}</p>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<!-- Not scoped: the animation SVG is injected via innerHTML (see
     appearance-anims.ts), so its classes can't carry scoped attributes.
     Everything is namespaced under .buyer-appearance instead. -->
<style>
.buyer-appearance {
  --ba-bg: #013155;
  --ba-sheet: #0b3d66;
  --ba-line: #24557f;
  --ba-ink: #f2f6fa;
  --ba-muted: #9fb6cb;
  --guide: #8ef0b0;
  --dim: #ffd43b;
  --bad: #ff8a73;
  --scratch: #e6eef6;
  --bg: var(--ba-bg);
  position: fixed;
  inset: 0;
  z-index: 300;
  background: var(--ba-bg);
  color: var(--ba-ink);
  font-family: var(--font-family);
  font-size: 15px;
  line-height: 1.55;
  color-scheme: dark;
}

.buyer-appearance .ba-screen {
  position: absolute;
  inset: 0;
  max-width: 440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.buyer-appearance button {
  font-family: inherit;
}

/* 動畫共用（from the original design） */
.buyer-appearance .arc {
  fill: none;
  stroke: var(--guide);
  stroke-width: 9;
  stroke-linecap: round;
}
.buyer-appearance .dimline {
  stroke: var(--dim);
  stroke-width: 5;
}
.buyer-appearance .halo {
  fill: none;
  stroke: var(--ba-bg);
  stroke-linecap: round;
}
.buyer-appearance .arw {
  fill: none;
  stroke: var(--guide);
  stroke-linecap: round;
}
.buyer-appearance .host {
  position: relative;
  overflow: hidden;
}
.buyer-appearance .host > svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.buyer-appearance .host > .stage {
  position: absolute;
  inset: 0;
  margin: auto;
  height: 100%;
  max-width: 100%;
  aspect-ratio: 896/1196;
  overflow: hidden;
}
.buyer-appearance .host.fill > .stage {
  width: 100%;
  aspect-ratio: auto;
}
.buyer-appearance .stage svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* 畫面 1 */
.buyer-appearance .ba-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(8px + env(safe-area-inset-top, 0px)) 12px 0 4px;
}
.buyer-appearance .ba-prog {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.buyer-appearance .ba-prog i {
  height: 3px;
  border-radius: 2px;
  background: var(--ba-line);
}
.buyer-appearance .ba-prog i.done {
  background: var(--ba-muted);
}
.buyer-appearance .ba-prog i.cur {
  background: var(--ba-ink);
}
.buyer-appearance .ba-skip {
  appearance: none;
  background: none;
  border: 0;
  color: var(--ba-muted);
  font-weight: 500;
  font-size: 14px;
  padding: 6px 2px;
  cursor: pointer;
}
.buyer-appearance .ba-icon {
  appearance: none;
  background: none;
  border: 0;
  color: var(--ba-ink);
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.buyer-appearance .ba-head {
  padding: 6px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.buyer-appearance .ba-code {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--ba-muted);
}
.buyer-appearance .ba-head h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}
.buyer-appearance .ba-anim {
  flex: 1;
  min-height: 0;
  margin-top: 6px;
}
.buyer-appearance .ba-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 16px calc(18px + env(safe-area-inset-bottom, 0px));
}
.buyer-appearance .ba-loopbar {
  width: 120px;
  height: 3px;
  border-radius: 2px;
  background: var(--ba-line);
  overflow: hidden;
}
.buyer-appearance .ba-loopbar i {
  display: block;
  height: 100%;
  background: var(--guide);
}
.buyer-appearance .ba-cta {
  appearance: none;
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 14px;
  background: var(--ba-ink);
  color: var(--ba-bg);
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.4s;
}
.buyer-appearance .ba-cta[data-ready='false'] {
  opacity: 0.35;
}
.buyer-appearance .ba-cta:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* 畫面 2 */
.buyer-appearance .ba-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: calc(6px + env(safe-area-inset-top, 0px)) 8px 2px;
}
.buyer-appearance .ba-nav h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  flex: 1;
  text-align: center;
}
.buyer-appearance .ba-count {
  width: 40px;
  text-align: center;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  color: var(--ba-muted);
}
.buyer-appearance .ba-freeze {
  position: relative;
  flex: 0 0 auto;
  height: 40vh;
}
.buyer-appearance .ba-freeze-host {
  position: absolute;
  inset: 0;
}
.buyer-appearance .ba-replay {
  position: absolute;
  right: 12px;
  bottom: 10px;
  appearance: none;
  border: 1px solid var(--ba-line);
  background: #013155cc;
  color: var(--ba-ink);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.buyer-appearance .ba-sheet {
  flex: 1;
  min-height: 0;
  background: var(--ba-sheet);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
}
.buyer-appearance .ba-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.buyer-appearance .ba-q h3 {
  margin: 0 0 2px;
  font-size: 17px;
  font-weight: 700;
}
.buyer-appearance .ba-q p {
  margin: 0;
  color: var(--ba-muted);
  font-size: 13px;
}
.buyer-appearance .ba-opts {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.buyer-appearance .ba-opt {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 9px 12px;
  border: 1.5px solid var(--ba-line);
  border-radius: 12px;
  cursor: pointer;
}
.buyer-appearance .ba-opt input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.buyer-appearance .ba-dot {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--ba-muted);
  margin-top: 2px;
  display: grid;
  place-items: center;
}
.buyer-appearance .ba-dot::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
}
.buyer-appearance .ba-opt b {
  display: block;
  font-size: 15px;
  line-height: 1.3;
}
.buyer-appearance .ba-opt .d {
  display: block;
  color: var(--ba-muted);
  font-size: 12.5px;
  line-height: 1.45;
  margin-top: 1px;
}
.buyer-appearance .ba-opt[data-k='ok']:has(input:checked) {
  border-color: var(--guide);
  background: color-mix(in srgb, var(--guide) 10%, transparent);
}
.buyer-appearance .ba-opt[data-k='ok']:has(input:checked) .ba-dot {
  border-color: var(--guide);
}
.buyer-appearance .ba-opt[data-k='ok']:has(input:checked) .ba-dot::after {
  background: var(--guide);
}
.buyer-appearance .ba-opt[data-k='bad']:has(input:checked) {
  border-color: var(--bad);
  background: color-mix(in srgb, var(--bad) 10%, transparent);
}
.buyer-appearance .ba-opt[data-k='bad']:has(input:checked) .ba-dot {
  border-color: var(--bad);
}
.buyer-appearance .ba-opt[data-k='bad']:has(input:checked) .ba-dot::after {
  background: var(--bad);
}
.buyer-appearance .ba-opt[data-k='unsure']:has(input:checked) {
  border-color: var(--dim);
  background: color-mix(in srgb, var(--dim) 9%, transparent);
}
.buyer-appearance .ba-opt[data-k='unsure']:has(input:checked) .ba-dot {
  border-color: var(--dim);
}
.buyer-appearance .ba-opt[data-k='unsure']:has(input:checked) .ba-dot::after {
  background: var(--dim);
}
.buyer-appearance .ba-note label {
  display: flex;
  justify-content: space-between;
  font-size: 13.5px;
  font-weight: 500;
  margin-bottom: 5px;
}
.buyer-appearance .ba-note small {
  color: var(--ba-muted);
  font-weight: 400;
}
.buyer-appearance .ba-note textarea {
  width: 100%;
  min-height: 64px;
  resize: vertical;
  background: var(--ba-bg);
  color: var(--ba-ink);
  border: 1.5px solid var(--ba-line);
  border-radius: 12px;
  padding: 8px 12px;
  font: 14px/1.5 var(--font-family);
}
.buyer-appearance .ba-err {
  color: var(--bad);
  font-size: 13px;
  margin: 6px 0 0;
}
.buyer-appearance .ba-photo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.buyer-appearance .ba-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--ba-line);
}
.buyer-appearance .ba-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--ba-line);
  border-radius: 999px;
  background: transparent;
  color: var(--ba-ink);
  font-size: 13px;
  cursor: pointer;
}
.buyer-appearance .ba-chip.ai {
  border-color: var(--guide);
  color: var(--guide);
}
.buyer-appearance .ba-chip:disabled {
  opacity: 0.5;
}
.buyer-appearance .ba-file {
  display: none;
}
.buyer-appearance {
  --ba-orange: #ff8c1a;
}
.buyer-appearance .ba-photo-open {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px 4px 4px;
  border: 1px solid var(--ba-line);
  border-radius: 14px;
  background: transparent;
  color: var(--ba-ink);
  font-size: 13.5px;
  cursor: pointer;
}
.buyer-appearance .ba-cam-badge {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--ba-orange);
  color: #fff;
}
.buyer-appearance .ba-popup-backdrop {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 20, 40, 0.6);
}
.buyer-appearance .ba-popup {
  position: relative;
  width: 100%;
  max-width: 320px;
  padding: 20px 18px 18px;
  border-radius: 18px;
  background: var(--ba-sheet);
  border: 1px solid var(--ba-line);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.buyer-appearance .ba-popup-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  background: none;
  color: var(--ba-muted);
  cursor: pointer;
}
.buyer-appearance .ba-popup-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.buyer-appearance .ba-popup-hint {
  margin: 0;
  font-size: 13px;
  color: var(--ba-muted);
}
.buyer-appearance .ba-cam-btn {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin: 6px 0 2px;
  border: 0;
  border-radius: 50%;
  background: var(--ba-orange);
  color: #fff;
  box-shadow: 0 6px 18px rgba(255, 140, 26, 0.35);
  cursor: pointer;
}
.buyer-appearance .ba-cam-btn:disabled {
  opacity: 0.6;
}
.buyer-appearance .ba-popup-img {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--ba-line);
}
.buyer-appearance .ba-popup-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}
.buyer-appearance .ba-popup-actions .ba-chip {
  flex: 1;
  justify-content: center;
}
.buyer-appearance .ba-bar {
  padding: 8px 16px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--ba-line);
  display: flex;
}
.buyer-appearance .ba-toast {
  position: absolute;
  left: 50%;
  bottom: calc(90px + env(safe-area-inset-bottom, 0px));
  transform: translate(-50%, 10px);
  background: var(--ba-ink);
  color: var(--ba-bg);
  font-weight: 700;
  padding: 10px 16px;
  border-radius: 999px;
  opacity: 0;
  transition: 0.3s;
  pointer-events: none;
  white-space: nowrap;
  z-index: 5;
}
.buyer-appearance .ba-toast.show {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
