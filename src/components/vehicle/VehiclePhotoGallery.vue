<script setup lang="ts">
/**
 * 車輛詳情's own photo gallery — cover photo (always `photos[0]`, matching
 * VehicleDetailView's pre-existing "hero = photos[0]" convention) plus a
 * thumbnail row for the rest (view/delete only — a leftover of a removed
 * "add to gallery" path, kept so vehicles that already have extra photos
 * don't lose them). The "新增照片" button lives on the cover banner and
 * always replaces the cover — never appends a thumbnail — so a vehicle only
 * ever has exactly one cover; the old cover file is deleted from Storage
 * once the replacement is saved, same as re-cropping and deleting a photo
 * below both clean up their own old file.
 */
import { computed, ref } from 'vue'
import { Bike, Plus, Trash2 } from 'lucide-vue-next'
import PhotoLightbox from '@/components/common/PhotoLightbox.vue'
import { storageService } from '@/services/firebase/storage.service'
import { imageCompressionService } from '@/services/media/image-compression.service'
import { useVehicleStore } from '@/stores/vehicle.store'

const props = defineProps<{ vehicleId: string; photos: string[] }>()

const vehicleStore = useVehicleStore()
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const activePhotoUrl = ref<string | null>(null)
const pendingFile = ref<File | null>(null)
// Matches wherever the photo actually displays — the cover banner reads as
// roughly 16:9 (fixed 200px height across a mobile-width card), thumbnails
// are perfect 1:1 squares — so the crop frame always produces a shape that
// won't get re-cropped by object-fit the moment it's saved.
const activePhotoAspect = ref(1)
const replacingPhoto = ref(false)

const cover = computed(() => props.photos[0] ?? null)
const thumbnails = computed(() => props.photos.slice(1))

function triggerAdd(): void {
  fileInput.value?.click()
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  // Crop happens before anything is uploaded. PhotoLightbox opens straight
  // into crop mode for a local File (see its `localFile` prop); the frame is
  // always the 16:9 cover shape since this always targets the cover slot.
  activePhotoAspect.value = 16 / 9
  pendingFile.value = file
}

async function handleNewPhotoCropConfirmed(blob: Blob): Promise<void> {
  const oldCover = cover.value
  uploading.value = true
  try {
    const { blob: compressed } = await imageCompressionService.compressImage(blob)
    const url = await storageService.uploadVehiclePhoto(props.vehicleId, compressed, 'jpg')
    await vehicleStore.updateVehicle(props.vehicleId, { photos: [url, ...thumbnails.value] })
    pendingFile.value = null
    if (oldCover) await storageService.deleteFileAtUrl(oldCover)
  } finally {
    uploading.value = false
  }
}

async function removePhoto(url: string): Promise<void> {
  if (!window.confirm('刪除這張照片？此操作無法復原。')) return
  await vehicleStore.updateVehicle(props.vehicleId, {
    photos: props.photos.filter((photo) => photo !== url),
  })
  await storageService.deleteFileAtUrl(url)
}

function openPhoto(url: string, aspect: number): void {
  activePhotoUrl.value = url
  activePhotoAspect.value = aspect
}

function closePhoto(): void {
  if (replacingPhoto.value) return
  activePhotoUrl.value = null
}

async function handleCropConfirmed(blob: Blob): Promise<void> {
  const originalUrl = activePhotoUrl.value
  if (!originalUrl) return
  replacingPhoto.value = true
  try {
    const { blob: compressed } = await imageCompressionService.compressImage(blob)
    const newUrl = await storageService.uploadVehiclePhoto(props.vehicleId, compressed, 'jpg')
    const nextPhotos = props.photos.map((photo) => (photo === originalUrl ? newUrl : photo))
    await vehicleStore.updateVehicle(props.vehicleId, { photos: nextPhotos })
    activePhotoUrl.value = null
    await storageService.deleteFileAtUrl(originalUrl)
  } finally {
    replacingPhoto.value = false
  }
}
</script>

<template>
  <div class="photo-gallery">
    <div class="cover">
      <img v-if="cover" :src="cover" class="cover-img" alt="" @click="openPhoto(cover, 16 / 9)" />
      <div v-else class="cover-empty">
        <Bike :size="56" color="var(--color-text-disabled)" />
      </div>
      <button class="add-btn" :disabled="uploading" @click="triggerAdd">
        <Plus :size="14" />{{ uploading ? '上傳中...' : cover ? '更換封面' : '新增照片' }}
      </button>
    </div>

    <div v-if="thumbnails.length > 0" class="thumb-row">
      <div v-for="photo in thumbnails" :key="photo" class="thumb">
        <img :src="photo" class="thumb-img" alt="" @click="openPhoto(photo, 1)" />
        <button class="thumb-btn delete-btn" aria-label="刪除照片" @click="removePhoto(photo)">
          <Trash2 :size="11" />
        </button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="handleFileChange"
    />

    <PhotoLightbox
      v-if="pendingFile"
      :local-file="pendingFile"
      :aspect-ratio="activePhotoAspect"
      :uploading="uploading"
      @close="pendingFile = null"
      @crop-confirmed="handleNewPhotoCropConfirmed"
    />

    <PhotoLightbox
      v-else-if="activePhotoUrl"
      :image-url="activePhotoUrl"
      :aspect-ratio="activePhotoAspect"
      :uploading="replacingPhoto"
      @close="closePhoto"
      @crop-confirmed="handleCropConfirmed"
    />
  </div>
</template>

<style scoped>
.photo-gallery {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.cover {
  position: relative;
  height: 200px;
  border-radius: var(--radius-lg);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.cover-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn {
  position: absolute;
  right: var(--space-sm);
  bottom: var(--space-sm);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.thumb-row {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding-bottom: 2px;
}

.thumb {
  position: relative;
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-background);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.thumb-btn {
  position: absolute;
  top: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}

.delete-btn {
  right: 2px;
}

.hidden-input {
  display: none;
}
</style>
