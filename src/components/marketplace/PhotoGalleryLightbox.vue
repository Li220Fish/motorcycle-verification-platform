<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-vue-next'

/**
 * Full-screen photo viewer for MarketplaceListingView.vue's cover + 其他照片
 * gallery, and MyListingManageView.vue's 驗證車輛照片 — opaque black backdrop,
 * large current photo, prev/next arrows, a thumbnail filmstrip of every
 * photo (cover included) to jump directly to one, and a manual 90°-rotate
 * button per photo (e.g. a verification photo captured sideways). Rotation
 * is VIEW-ONLY — nothing here ever re-uploads or mutates the source photo;
 * for a verification's own evidence that's a hard requirement, not just a
 * simplification (firestore.rules: verification data is immutable once
 * public). Not the same component as PhotoLightbox.vue (that one is a
 * single-photo zoom+crop EDITING tool for the capture flow).
 */
const props = defineProps<{ photos: string[]; startIndex: number }>()
const emit = defineEmits<{ close: [] }>()

const currentIndex = ref(props.startIndex)
watch(
  () => props.startIndex,
  (value) => {
    currentIndex.value = value
  },
)

function go(delta: number): void {
  const count = props.photos.length
  currentIndex.value = (currentIndex.value + delta + count) % count
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
  else if (event.key === 'ArrowLeft') go(-1)
  else if (event.key === 'ArrowRight') go(1)
}

// Per-photo rotation (index -> degrees), reset every time this component is
// mounted fresh — a deliberate view-session-only convenience, not saved
// anywhere.
const rotations = ref<Record<number, number>>({})
function rotateCurrent(): void {
  const current = rotations.value[currentIndex.value] ?? 0
  rotations.value = { ...rotations.value, [currentIndex.value]: (current + 90) % 360 }
}

// `transform: rotate()` doesn't change an element's own layout box, only
// its visual rendering — so a 90°/270°-rotated photo would otherwise
// overflow the stage on whichever axis was originally taller. Measuring the
// stage's actual pixel size (ResizeObserver — device width/orientation can
// change while this is open) and each photo's natural size (on load) lets
// the image's OWN box be pre-sized so the ROTATED result still fits.
const stageEl = ref<HTMLElement | null>(null)
const stageSize = reactive({ width: 0, height: 0 })
const naturalSize = reactive({ width: 0, height: 0 })
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!stageEl.value) return
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    stageSize.width = entry.contentRect.width
    stageSize.height = entry.contentRect.height
  })
  resizeObserver.observe(stageEl.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

function onStageImgLoad(event: Event): void {
  const img = event.target as HTMLImageElement
  naturalSize.width = img.naturalWidth
  naturalSize.height = img.naturalHeight
}

const currentRotation = computed(() => rotations.value[currentIndex.value] ?? 0)

const stageImgStyle = computed(() => {
  const rotation = currentRotation.value
  const style: Record<string, string> = { transform: `rotate(${rotation}deg)` }
  const { width: nw, height: nh } = naturalSize
  const { width: sw, height: sh } = stageSize
  if (!nw || !nh || !sw || !sh) return style
  const rotated = rotation % 180 !== 0
  const contentW = rotated ? nh : nw
  const contentH = rotated ? nw : nh
  const scale = Math.min(sw / contentW, sh / contentH)
  style.width = `${nw * scale}px`
  style.height = `${nh * scale}px`
  return style
})

// Reset the natural-size measurement on every photo change so the previous
// photo's dimensions never briefly apply to the new one before its own
// `load` event fires.
watch(currentIndex, () => {
  naturalSize.width = 0
  naturalSize.height = 0
})
</script>

<template>
  <div class="overlay" tabindex="0" @keydown="onKeydown" @click.self="emit('close')">
    <button class="close-btn" aria-label="關閉" @click="emit('close')">
      <X :size="22" />
    </button>
    <button class="rotate-btn" aria-label="旋轉90度" @click.stop="rotateCurrent">
      <RotateCw :size="19" />
    </button>

    <div ref="stageEl" class="stage">
      <button
        v-if="photos.length > 1"
        class="nav-btn nav-prev"
        aria-label="上一張"
        @click.stop="go(-1)"
      >
        <ChevronLeft :size="26" />
      </button>

      <img
        :src="photos[currentIndex]"
        class="stage-img"
        :style="stageImgStyle"
        alt=""
        @load="onStageImgLoad"
      />

      <button
        v-if="photos.length > 1"
        class="nav-btn nav-next"
        aria-label="下一張"
        @click.stop="go(1)"
      >
        <ChevronRight :size="26" />
      </button>
    </div>

    <div v-if="photos.length > 1" class="filmstrip">
      <button
        v-for="(photo, index) in photos"
        :key="index"
        class="thumb-btn"
        :class="{ selected: index === currentIndex }"
        :aria-label="`第 ${index + 1} 張照片`"
        @click.stop="currentIndex = index"
      >
        <img
          :src="photo"
          class="thumb-img"
          :style="{ transform: `rotate(${rotations[index] ?? 0}deg)` }"
          alt=""
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  flex-direction: column;
  outline: none;
}

.close-btn,
.rotate-btn {
  position: absolute;
  top: calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px);
  z-index: 1;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn {
  left: 14px;
}

.rotate-btn {
  right: 14px;
}

.stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0 var(--space-md);
}

.stage-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-prev {
  left: var(--space-sm);
}

.nav-next {
  right: var(--space-sm);
}

.filmstrip {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: var(--space-sm) var(--space-md)
    calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + var(--space-sm));
}

.thumb-btn {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  opacity: 0.55;
}

.thumb-btn.selected {
  border-color: #fff;
  opacity: 1;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
