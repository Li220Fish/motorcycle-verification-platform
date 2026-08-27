<script setup lang="ts">
import { ref } from 'vue'

import { cameraService } from '@/services/media/camera.service'
import { storageService } from '@/services/firebase/storage.service'

const props = defineProps<{ folder: 'vehicle-images' | 'verification-images' }>()

const previewUrl = ref('')
const errorMessage = ref('')
const uploading = ref(false)
const uploadedUrl = ref('')
let capturedBlobUrl = ''

async function handleTakePhoto(): Promise<void> {
  errorMessage.value = ''
  uploadedUrl.value = ''
  try {
    const result = await cameraService.takePhoto()
    previewUrl.value = result.webPath ?? ''
    capturedBlobUrl = result.webPath ?? ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to take photo'
  }
}

async function handleUpload(): Promise<void> {
  if (!capturedBlobUrl) return
  uploading.value = true
  errorMessage.value = ''
  try {
    const blob = await fetch(capturedBlobUrl).then((response) => response.blob())
    uploadedUrl.value = await storageService.uploadFile(
      props.folder,
      blob,
      `photo-${Date.now()}.jpg`,
    )
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="capture-block">
    <h3>Camera — Photo</h3>
    <div class="controls">
      <button @click="handleTakePhoto">Take Photo</button>
      <button :disabled="!previewUrl || uploading" @click="handleUpload">
        {{ uploading ? 'Uploading...' : 'Upload to Storage' }}
      </button>
    </div>
    <img v-if="previewUrl" :src="previewUrl" alt="Captured photo" class="preview-image" />
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="uploadedUrl">
      Uploaded: <a :href="uploadedUrl" target="_blank" rel="noopener">{{ uploadedUrl }}</a>
    </p>
  </div>
</template>

<style scoped>
.capture-block {
  margin-bottom: 1.5rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.preview-image {
  max-width: 240px;
  display: block;
  border: 1px solid #e0e0e0;
}

.error {
  color: #b00020;
}
</style>
