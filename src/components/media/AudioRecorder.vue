<script setup lang="ts">
import { ref } from 'vue'

import { audioRecorderService } from '@/services/media/audio-recorder.service'
import { storageService } from '@/services/firebase/storage.service'

const recording = ref(false)
const previewUrl = ref('')
const durationMs = ref(0)
const errorMessage = ref('')
const uploading = ref(false)
const uploadedUrl = ref('')

let capturedBlob: Blob | null = null

async function handleStart(): Promise<void> {
  errorMessage.value = ''
  uploadedUrl.value = ''
  try {
    await audioRecorderService.start()
    recording.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to start recording'
  }
}

async function handleStop(): Promise<void> {
  try {
    const result = await audioRecorderService.stop()
    capturedBlob = result.blob
    durationMs.value = result.durationMs
    previewUrl.value = URL.createObjectURL(result.blob)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to stop recording'
  } finally {
    recording.value = false
  }
}

async function handleUpload(): Promise<void> {
  if (!capturedBlob) return
  uploading.value = true
  errorMessage.value = ''
  try {
    uploadedUrl.value = await storageService.uploadFileAtPath(
      `dev-test/audio-${Date.now()}.aac`,
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
    <h3>Microphone — Audio</h3>
    <div class="controls">
      <button :disabled="recording" @click="handleStart">Start Recording</button>
      <button :disabled="!recording" @click="handleStop">Stop Recording</button>
      <button :disabled="!previewUrl || uploading" @click="handleUpload">
        {{ uploading ? 'Uploading...' : 'Upload to Storage' }}
      </button>
    </div>
    <p v-if="recording" class="hint">Recording...</p>
    <audio v-if="previewUrl" :src="previewUrl" controls class="preview-audio" />
    <p v-if="previewUrl">Duration: {{ (durationMs / 1000).toFixed(1) }}s</p>
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

.preview-audio {
  display: block;
  margin-bottom: 0.5rem;
}

.hint {
  color: #666;
}

.error {
  color: #b00020;
}
</style>
