<script setup lang="ts">
/**
 * Shared zoom + crop viewer for a single already-uploaded photo URL (vehicle
 * gallery / marketplace listing photos). "放大" is just the plain `view`
 * mode below (an `<img>` at full size, same idea InspectionReportBody.vue's
 * lightbox already used for evidence photos) — cropping is the new part,
 * entered explicitly via the 裁切 button.
 *
 * Cropping needs actual pixel access (canvas), which a remote Storage URL
 * can't give a canvas directly without risking a CORS-tainted canvas — so
 * entering crop mode re-fetches the image as a Blob (`fetch` + `.blob()`)
 * and decodes it with `createImageBitmap` (same technique already used by
 * image-compression.service.ts) instead of drawing from an `<img>` element.
 * If that fetch/decode fails for any reason, it fails loudly into an error
 * state rather than silently — plain viewing (no fetch involved) is
 * unaffected either way.
 *
 * The crop UI is a FIXED-size frame at `aspectRatio` (matching wherever the
 * caller actually displays this photo — a 16:9 cover banner or a 1:1
 * thumbnail) — the user pans/zooms the photo behind that frame instead of
 * dragging a free-form rectangle, so the result always matches the shape it
 * will be shown in.
 *
 * This component only ever PRODUCES a cropped Blob via `cropConfirmed` — it
 * never uploads or knows about vehicle/listing photo arrays. The caller
 * (VehiclePhotoGallery.vue / MyListingManageView.vue) owns compressing,
 * uploading, and replacing the URL in its own data, and controls `uploading`
 * to keep this view showing a busy state until that finishes.
 */
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { Check, Crop as CropIcon, Loader2, X, ZoomIn, ZoomOut } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{ imageUrl: string; uploading?: boolean; aspectRatio?: number }>(),
  { aspectRatio: 1 },
)
const emit = defineEmits<{ close: []; cropConfirmed: [Blob] }>()

type Mode = 'view' | 'loading-crop' | 'crop' | 'error'
const mode = ref<Mode>('view')
const errorMessage = ref('')

let bitmap: ImageBitmap | null = null
let previewObjectUrl: string | null = null
const previewUrl = ref('')
const naturalSize = reactive({ width: 0, height: 0 })

// The crop frame's on-screen size — fixed for the whole session at
// `aspectRatio`, capped to comfortably fit a mobile viewport either way.
const FRAME_MAX_WIDTH = 300
const FRAME_MAX_HEIGHT = 300
const frameSize = reactive({ width: FRAME_MAX_WIDTH, height: FRAME_MAX_WIDTH })

const imgScale = ref(1)
const minScale = ref(1)
const maxScale = ref(1)
const imgOffset = reactive({ x: 0, y: 0 })

function cleanupBitmap(): void {
  bitmap?.close()
  bitmap = null
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
  previewObjectUrl = null
  previewUrl.value = ''
}
onBeforeUnmount(cleanupBitmap)

function computeFrame(): void {
  const ratio = props.aspectRatio
  let width = FRAME_MAX_WIDTH
  let height = width / ratio
  if (height > FRAME_MAX_HEIGHT) {
    height = FRAME_MAX_HEIGHT
    width = height * ratio
  }
  frameSize.width = Math.round(width)
  frameSize.height = Math.round(height)
}

// Re-centers on whatever's currently at the frame's center, so zooming feels
// like it's zooming into the photo rather than jumping the view around.
function clampOffset(): void {
  const scaledW = naturalSize.width * imgScale.value
  const scaledH = naturalSize.height * imgScale.value
  const minX = frameSize.width - scaledW
  const minY = frameSize.height - scaledH
  imgOffset.x = Math.min(0, Math.max(minX, imgOffset.x))
  imgOffset.y = Math.min(0, Math.max(minY, imgOffset.y))
}

function initializeTransform(): void {
  // The smallest scale at which the photo still fully covers the frame —
  // going any smaller would leave empty space showing through a corner.
  const coverScale = Math.max(
    frameSize.width / naturalSize.width,
    frameSize.height / naturalSize.height,
  )
  minScale.value = coverScale
  maxScale.value = coverScale * 3
  imgScale.value = coverScale
  imgOffset.x = (frameSize.width - naturalSize.width * coverScale) / 2
  imgOffset.y = (frameSize.height - naturalSize.height * coverScale) / 2
}

async function enterCropMode(): Promise<void> {
  mode.value = 'loading-crop'
  errorMessage.value = ''
  try {
    // `cache: 'no-store'` is required, not just an optimization — this image
    // was almost always already shown via a plain `<img>` tag (view mode,
    // gallery thumbnails), which primes the browser's disk cache. A default
    // fetch() then revalidates against that cache entry; Chromium has a bug
    // where a 304 revalidation response loses its Access-Control-Allow-Origin
    // header on the way back to fetch(), so the CORS check fails even though
    // the real server response always carries the header (confirmed via
    // curl). Forcing a full re-fetch every time sidesteps the 304 path
    // entirely instead of depending on a Chromium fix.
    const response = await fetch(props.imageUrl, { cache: 'no-store' })
    if (!response.ok) throw new Error(`fetch failed: ${response.status}`)
    const sourceBlob = await response.blob()
    cleanupBitmap()
    bitmap = await createImageBitmap(sourceBlob)
    previewObjectUrl = URL.createObjectURL(sourceBlob)
    previewUrl.value = previewObjectUrl
    naturalSize.width = bitmap.width
    naturalSize.height = bitmap.height

    computeFrame()
    initializeTransform()

    mode.value = 'crop'
    await nextTick()
  } catch (error) {
    console.error('[PhotoLightbox] failed to load image for cropping:', error)
    // Surface the actual browser-reported reason (network/CORS/decode) instead
    // of a single generic sentence — this is the only place that reason ever
    // reaches anyone outside a devtools console, and a live user hitting this
    // can't attach a console log to a bug report.
    const detail = error instanceof Error ? error.message : String(error)
    errorMessage.value = `無法載入圖片進行裁切，請稍後再試。（${detail}）`
    mode.value = 'error'
  }
}

function cancelCrop(): void {
  mode.value = 'view'
  cleanupBitmap()
}

let panning = false
let panStart = { x: 0, y: 0 }
let offsetStart = { x: 0, y: 0 }

function startPan(event: PointerEvent): void {
  if (props.uploading) return
  panning = true
  panStart = { x: event.clientX, y: event.clientY }
  offsetStart = { ...imgOffset }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onPanMove(event: PointerEvent): void {
  if (!panning) return
  imgOffset.x = offsetStart.x + (event.clientX - panStart.x)
  imgOffset.y = offsetStart.y + (event.clientY - panStart.y)
  clampOffset()
}

function endPan(): void {
  panning = false
}

// Keeps whatever's at the frame's center fixed in image-space while the
// scale changes, rather than always re-centering on the image's own middle.
function setZoom(nextScale: number): void {
  const clamped = Math.min(maxScale.value, Math.max(minScale.value, nextScale))
  const centerX = frameSize.width / 2
  const centerY = frameSize.height / 2
  const ratio = clamped / imgScale.value
  imgOffset.x = centerX - (centerX - imgOffset.x) * ratio
  imgOffset.y = centerY - (centerY - imgOffset.y) * ratio
  imgScale.value = clamped
  clampOffset()
}

const zoomModel = computed({
  get: () => imgScale.value,
  set: (value: number) => setZoom(value),
})

const previewImgStyle = computed(() => ({
  width: `${naturalSize.width * imgScale.value}px`,
  height: `${naturalSize.height * imgScale.value}px`,
  transform: `translate(${imgOffset.x}px, ${imgOffset.y}px)`,
}))

async function confirmCrop(): Promise<void> {
  if (!bitmap || props.uploading) return
  const sx = Math.round(-imgOffset.x / imgScale.value)
  const sy = Math.round(-imgOffset.y / imgScale.value)
  const sw = Math.round(frameSize.width / imgScale.value)
  const sh = Math.round(frameSize.height / imgScale.value)

  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  })
  if (!blob) return
  emit('cropConfirmed', blob)
}
</script>

<template>
  <!-- Teleported to <body> — position:fixed here would otherwise be
       contained by whatever ancestor page wraps this component, if any of
       them ever sets transform/filter/will-change (a fixed descendant's
       containing block becomes the nearest such ancestor instead of the
       viewport, per the CSS spec). Confirmed live on device: without this,
       the overlay only covered the space between AppHeader and
       BottomNavigation instead of the true full screen. -->
  <Teleport to="body">
    <div class="lightbox-overlay" @click.self="mode === 'view' && $emit('close')">
      <button
        v-if="mode !== 'crop' && mode !== 'loading-crop'"
        class="lightbox-close"
        aria-label="關閉"
        @click="$emit('close')"
      >
        <X :size="22" />
      </button>

      <template v-if="mode === 'view'">
        <img :src="imageUrl" class="lightbox-img" alt="" @click.stop />
        <button class="crop-enter-btn" @click.stop="enterCropMode">
          <CropIcon :size="16" /> 裁切
        </button>
      </template>

      <p v-else-if="mode === 'loading-crop'" class="lightbox-status">
        <Loader2 :size="20" class="spin" /> 載入圖片中...
      </p>

      <template v-else-if="mode === 'error'">
        <p class="lightbox-status error">{{ errorMessage }}</p>
        <button class="crop-cancel-btn" @click="mode = 'view'">返回</button>
      </template>

      <template v-else>
        <div
          class="crop-frame"
          :style="{ width: frameSize.width + 'px', height: frameSize.height + 'px' }"
          @click.stop
          @pointerdown="startPan"
          @pointermove="onPanMove"
          @pointerup="endPan"
          @pointercancel="endPan"
        >
          <img
            :src="previewUrl"
            class="crop-frame-img"
            draggable="false"
            :style="previewImgStyle"
          />
        </div>
        <p class="crop-hint">拖曳照片調整位置，用下方滑桿縮放</p>
        <div class="zoom-row" @click.stop>
          <ZoomOut :size="16" color="#fff" />
          <input
            v-model.number="zoomModel"
            type="range"
            class="zoom-slider"
            :min="minScale"
            :max="maxScale"
            step="0.001"
          />
          <ZoomIn :size="16" color="#fff" />
        </div>
        <div class="crop-actions">
          <button class="crop-cancel-btn" :disabled="uploading" @click="cancelCrop">取消</button>
          <button class="crop-confirm-btn" :disabled="uploading" @click="confirmCrop">
            <Loader2 v-if="uploading" :size="16" class="spin" />
            <Check v-else :size="16" />
            {{ uploading ? '上傳中...' : '確認裁切' }}
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  padding: var(--space-lg);
  /* Solid, not translucent — this is a true full-screen takeover (see the
     Teleport comment above), so letting the page underneath show through
     even faintly just reads as a rendering glitch rather than a deliberate
     dimmed-backdrop look. */
  background: #0f172a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}

.lightbox-close {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: 70vh;
  border-radius: var(--radius-md);
}

.lightbox-status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: #fff;
  font-size: 14px;
}

.lightbox-status.error {
  color: var(--color-danger, #f87171);
  text-align: center;
  max-width: 280px;
}

.crop-enter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 700;
}

.crop-frame {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-sm);
  border: 2px solid #fff;
  touch-action: none;
  cursor: move;
}

.crop-frame-img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  pointer-events: none;
}

.crop-hint {
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
}

.zoom-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  max-width: 280px;
}

.zoom-slider {
  flex: 1;
  min-width: 0;
}

.crop-actions {
  display: flex;
  gap: var(--space-sm);
}

.crop-cancel-btn,
.crop-confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 700;
}

.crop-cancel-btn {
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: transparent;
  color: #fff;
}

.crop-confirm-btn {
  border: none;
  background: var(--color-primary);
  color: #fff;
}

.crop-cancel-btn:disabled,
.crop-confirm-btn:disabled {
  opacity: 0.5;
}

.spin {
  animation: photo-lightbox-spin 0.8s linear infinite;
}

@keyframes photo-lightbox-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
