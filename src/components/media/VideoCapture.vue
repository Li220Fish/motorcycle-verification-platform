<script setup lang="ts">
import { ref } from 'vue'

import { storageService } from '@/services/firebase/storage.service'
import { platformService } from '@/services/platform/platform.service'
import { cameraService } from '@/services/media/camera.service'

const previewUrl = ref('')
const errorMessage = ref('')
const uploading = ref(false)
const uploadedUrl = ref('')
const isNative = platformService.isNative()

let capturedBlob: Blob | null = null

async function handleRecordVideo(): Promise<void> {
  errorMessage.value = ''
  uploadedUrl.value = ''
  try {
    const result = await cameraService.recordVideo()
    if (!result.webPath) throw new Error('No video returned')
    const blob = await fetch(result.webPath).then((response) => response.blob())
    capturedBlob = blob
    previewUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to record video'
  }
}

function handleWebFileChange(event: Event): void {
  errorMessage.value = ''
  uploadedUrl.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  capturedBlob = file
  previewUrl.value = URL.createObjectURL(file)
}

async function handleUpload(): Promise<void> {
  if (!capturedBlob) return
  uploading.value = true
  errorMessage.value = ''
  try {
    uploadedUrl.value = await storageService.uploadFileAtPath(
      `dev-test/video-${Date.now()}.mp4`,
      capturedBlob,
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
    <h3>Camera — Video</h3>
    <div class="controls">
      <button v-if="isNative" @click="handleRecordVideo">Record Video</button>
      <label v-else class="file-button">
        Record Video
        <input type="file" accept="video/*" capture="environment" @change="handleWebFileChange" />
      </label>
      <button :disabled="!previewUrl || uploading" @click="handleUpload">
        {{ uploading ? 'Uploading...' : 'Upload to Storage' }}
      </button>
    </div>
    <p v-if="!isNative" class="hint">
      Browser fallback: opens the OS file/camera picker (native in-app recording requires the
      Android/iOS app).
    </p>
    <video v-if="previewUrl" :src="previewUrl" controls class="preview-video" />
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
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.file-button {
  position: relative;
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.file-button input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.preview-video {
  max-width: 320px;
  display: block;
  border: 1px solid #e0e0e0;
}

.hint {
  color: #666;
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
}

.error {
  color: #b00020;
}
</style>
