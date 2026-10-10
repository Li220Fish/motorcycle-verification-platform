<script setup lang="ts">
/**
 * Full-screen, camera-app-style capture for Optional items where the user
 * may want to attach an open-ended number of supporting photos (currently
 * only PREP-02-DAMAGE-PHOTOS — see item.multiPhoto in verification.types.ts)
 * — unlike every other photo item, which hands off to the native OS camera
 * for exactly one shot. This renders its own live `getUserMedia` viewfinder
 * (same mechanism video-recorder.service.ts already proved works in this
 * WebView for Step 3/39) with our own guidance/shutter/filmstrip UI drawn on
 * top, so the camera never actually leaves the app.
 *
 * Every shutter tap saves immediately (no confirm/retake step) — matches
 * this app's established "拍完就是完成" convention, just repeatable: the
 * live feed stays open so the user can keep going, and taps 完成 (top
 * right) only when they're done adding photos, not after every single one.
 */
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Flashlight } from 'lucide-vue-next'

import { liveCameraService } from '@/services/media/live-camera.service'
import { storageService } from '@/services/firebase/storage.service'
import { imageCompressionService } from '@/services/media/image-compression.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = defineProps<{ verificationId: string; itemId: string; label: string }>()
const emit = defineEmits<{ advance: [] }>()

const verificationStore = useVerificationStore()

type Phase = 'requesting' | 'live' | 'denied'
const phase = ref<Phase>('requesting')
const errorMessage = ref('')
const previewEl = ref<HTMLVideoElement | null>(null)
const flashing = ref(false)
const torchSupported = ref(false)
const torchOn = ref(false)
const uploading = ref(false)
const uploadErrorMessage = ref('')

const capturedEvidence = () => verificationStore.evidenceByItem[props.itemId] ?? []

// `localUri` is a `URL.createObjectURL()` blob: reference — only valid
// within the browser session/page-load that created it, but it's persisted
// on the evidence doc forever. On resume in a later session that blob is
// gone — see CorePhotoCaptureFlow.vue's identical fix for the same bug
// found live there. `remoteUrl` is a Storage object PATH, not a directly-
// usable URL (see storage.service.ts's uploadPrivateFile doc comment), so
// it needs resolving the same way EvidencePreview.vue does.
const resolvedThumbUrls = reactive<Record<string, string>>({})
watch(
  () => verificationStore.evidenceByItem[props.itemId],
  (list) => {
    for (const evidence of list ?? []) {
      if (evidence.remoteUrl && !(evidence.id in resolvedThumbUrls)) {
        storageService
          .resolveDownloadUrl(evidence.remoteUrl)
          .then((url) => {
            resolvedThumbUrls[evidence.id] = url
          })
          .catch(() => {})
      }
    }
  },
  { deep: true, immediate: true },
)

function thumbnailFor(evidence: VerificationEvidence): string | undefined {
  return resolvedThumbUrls[evidence.id] ?? evidence.localUri
}

async function setTorch(on: boolean): Promise<void> {
  if (!torchSupported.value) return
  try {
    await liveCameraService.setTorch(on)
    torchOn.value = on
  } catch (error) {
    console.error('[MultiPhotoEvidenceCapture] torch toggle failed:', error)
  }
}

async function startCamera(): Promise<void> {
  phase.value = 'requesting'
  errorMessage.value = ''
  try {
    const stream = await liveCameraService.start()
    phase.value = 'live'
    await nextTick()
    if (previewEl.value) previewEl.value.srcObject = stream
    torchOn.value = false
    torchSupported.value = await liveCameraService.isTorchSupported()
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

/**
 * Uploads to Firebase Storage BEFORE writing the evidence doc, and only
 * writes it on success — see CorePhotoCaptureFlow.vue's capturePhoto() for
 * why: a prior "local-first + background queue" version could permanently
 * orphan a photo evidence doc with no remoteUrl and no server-side way to
 * notice, which is exactly what a real admin report of "can't view any core
 * photos" turned out to be. Trade-off: the shutter is disabled for the
 * duration of each upload, same as the single-photo capture flow.
 */
async function capturePhoto(): Promise<void> {
  if (phase.value !== 'live' || !previewEl.value || uploading.value) return
  const video = previewEl.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  })
  if (!blob) return
  flashShutter()

  uploadErrorMessage.value = ''
  uploading.value = true
  try {
    const compressed = await imageCompressionService.compressImage(blob)
    const remoteUrl = await storageService.uploadEvidenceFile(
      props.verificationId,
      props.itemId,
      compressed.blob,
      'jpg',
    )
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId: props.itemId,
      type: 'photo',
      localUri: URL.createObjectURL(blob),
      remoteUrl,
      createdAt: Date.now(),
      captureSource: 'camera',
      captureTimestamp: Date.now(),
    }
    await verificationStore.addEvidence(evidence)
  } catch (error) {
    uploadErrorMessage.value =
      error instanceof Error ? error.message : '上傳失敗，請重新拍攝這張照片'
  } finally {
    uploading.value = false
  }
}

function handleDone(): void {
  liveCameraService.stop()
  const hasPhotos = capturedEvidence().length > 0
  void verificationStore.saveAnswer(props.itemId, hasPhotos ? 'attention' : 'normal')
  emit('advance')
}

onMounted(startCamera)
onBeforeUnmount(() => liveCameraService.stop())
</script>

<template>
  <!-- Teleported to <body> — see PhotoLightbox.vue's identical comment:
       position:fixed here would otherwise be contained by whatever ancestor
       page wraps this component if any of them sets transform/filter/
       will-change, instead of covering the true viewport. -->
  <Teleport to="body">
    <div class="multi-photo-capture">
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
          <button class="retry-btn" @click="startCamera">重試</button>
        </template>
      </div>

      <Transition name="flash-fade">
        <div v-if="flashing" class="shutter-flash" />
      </Transition>

      <div class="top-overlay">
        <div class="top-titles">
          <p class="top-title">{{ label }}</p>
          <p v-if="uploading" class="top-subtitle">上傳中...</p>
          <p v-else class="top-subtitle">拍攝完成後請點右上角「完成」</p>
        </div>
        <button class="done-btn" @click="handleDone">完成</button>
      </div>

      <p v-if="uploadErrorMessage" class="upload-error-banner">{{ uploadErrorMessage }}</p>

      <div class="bottom-overlay">
        <div v-if="capturedEvidence().length > 0" class="filmstrip">
          <img
            v-for="evidence in capturedEvidence()"
            :key="evidence.id"
            :src="thumbnailFor(evidence)"
            class="filmstrip-thumb"
            alt=""
          />
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
            :disabled="phase !== 'live' || uploading"
            aria-label="拍照"
            @click="capturePhoto"
          >
            <span class="shutter-inner" />
          </button>
          <div class="shutter-spacer"></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.multi-photo-capture {
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

.flash-fade-enter-active,
.flash-fade-leave-active {
  transition: opacity 0.15s ease;
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
  padding: calc(var(--space-md) + var(--safe-area-inset-top, env(safe-area-inset-top)))
    var(--space-md) var(--space-lg);
  background: linear-gradient(rgba(0, 0, 0, 0.55), transparent);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.top-titles {
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

.upload-error-banner {
  position: absolute;
  top: calc(var(--space-md) + var(--safe-area-inset-top, env(safe-area-inset-top)) + 52px);
  left: var(--space-md);
  right: var(--space-md);
  margin: 0;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background: var(--color-danger);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  z-index: 5;
}

.done-btn {
  flex: 0 0 auto;
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
  padding: var(--space-md) var(--space-md)
    calc(var(--space-lg) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)));
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.filmstrip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
}

.filmstrip-thumb {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.7);
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
</style>
