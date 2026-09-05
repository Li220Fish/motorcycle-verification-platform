<script setup lang="ts">
/**
 * 車輛詳情's own photo gallery — cover photo (always `photos[0]`, matching
 * VehicleDetailView's pre-existing "hero = photos[0]" convention) plus a
 * thumbnail row for the rest. Tapping a thumbnail promotes it to cover by
 * reordering the array; there is no separate "cover" flag on the Vehicle
 * doc, index 0 IS the cover.
 */
import { computed, ref } from 'vue'
import { Bike, Plus, Star, Trash2 } from 'lucide-vue-next'
import { storageService } from '@/services/firebase/storage.service'
import { useVehicleStore } from '@/stores/vehicle.store'

const props = defineProps<{ vehicleId: string; photos: string[] }>()

const vehicleStore = useVehicleStore()
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const cover = computed(() => props.photos[0] ?? null)
const thumbnails = computed(() => props.photos.slice(1))

function triggerAdd(): void {
  fileInput.value?.click()
}

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  try {
    const extension = file.name.split('.').pop() || 'jpg'
    const url = await storageService.uploadVehiclePhoto(props.vehicleId, file, extension)
    await vehicleStore.updateVehicle(props.vehicleId, { photos: [...props.photos, url] })
  } finally {
    uploading.value = false
  }
}

async function setCover(url: string): Promise<void> {
  const next = [url, ...props.photos.filter((photo) => photo !== url)]
  await vehicleStore.updateVehicle(props.vehicleId, { photos: next })
}

async function removePhoto(url: string): Promise<void> {
  if (!window.confirm('刪除這張照片？此操作無法復原。')) return
  await vehicleStore.updateVehicle(props.vehicleId, {
    photos: props.photos.filter((photo) => photo !== url),
  })
}
</script>

<template>
  <div class="photo-gallery">
    <div class="cover">
      <img v-if="cover" :src="cover" class="cover-img" alt="" />
      <div v-else class="cover-empty">
        <Bike :size="56" color="var(--color-text-disabled)" />
      </div>
      <button class="add-btn" :disabled="uploading" @click="triggerAdd">
        <Plus :size="14" />{{ uploading ? '上傳中...' : '新增照片' }}
      </button>
    </div>

    <div v-if="thumbnails.length > 0" class="thumb-row">
      <div v-for="photo in thumbnails" :key="photo" class="thumb">
        <img :src="photo" class="thumb-img" alt="" @click="setCover(photo)" />
        <button class="thumb-btn cover-btn" aria-label="設為封面" @click="setCover(photo)">
          <Star :size="11" />
        </button>
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

.cover-btn {
  left: 2px;
}

.delete-btn {
  right: 2px;
}

.hidden-input {
  display: none;
}
</style>
