<script setup lang="ts">
import { ref } from 'vue'

import { audioRecorderService } from '@/services/media/audio-recorder.service'
import { storageService } from '@/services/firebase/storage.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = defineProps<{
  verificationId: string
  itemId: string
}>()

const recording = ref(false)
const previewUrl = ref('')
const durationMs = ref(0)
const uploading = ref(false)
const errorMessage = ref('')
let capturedBlob: Blob | null = null

async function handleStart(): Promise<void> {
  errorMessage.value = ''
  try {
    await audioRecorderService.start()
    recording.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '無法開始錄音'
  }
}

async function handleStop(): Promise<void> {
  try {
    const result = await audioRecorderService.stop()
    capturedBlob = result.blob
    durationMs.value = result.durationMs
    previewUrl.value = URL.createObjectURL(result.blob)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '錄音失敗'
  } finally {
    recording.value = false
  }
}

async function handleConfirm(): Promise<void> {
  if (!capturedBlob) return
  uploading.value = true
  try {
    let remoteUrl: string | undefined
    try {
      remoteUrl = await storageService.uploadEvidenceFile(
        props.verificationId,
        props.itemId,
        capturedBlob,
        'aac',
      )
    } catch {
      remoteUrl = undefined
    }
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId: props.itemId,
      type: 'audio',
      localUri: previewUrl.value,
      remoteUrl,
      createdAt: Date.now(),
      captureSource: 'camera',
      captureTimestamp: Date.now(),
      metadata: { durationMs: durationMs.value },
    }
    await useVerificationStore().addEvidence(evidence)
    previewUrl.value = ''
    capturedBlob = null
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="audio-capture">
    <template v-if="!previewUrl">
      <button v-if="!recording" class="capture-button" @click="handleStart">開始錄音</button>
      <button v-else class="capture-button recording" @click="handleStop">停止錄音</button>
    </template>
    <template v-else>
      <audio :src="previewUrl" controls />
      <p class="duration">長度：{{ (durationMs / 1000).toFixed(1) }}s</p>
      <div class="preview-actions">
        <button class="secondary" @click="previewUrl = ''">重新錄製</button>
        <button class="primary" :disabled="uploading" @click="handleConfirm">
          {{ uploading ? '儲存中...' : '確認錄音' }}
        </button>
      </div>
    </template>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.audio-capture {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.capture-button {
  height: 46px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary);
  background: #e8f1fd;
  color: var(--color-primary);
  font-weight: 600;
}

.capture-button.recording {
  border-color: var(--color-danger);
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

audio {
  width: 100%;
}

.duration {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.preview-actions {
  display: flex;
  gap: var(--space-sm);
}

.preview-actions button {
  flex: 1;
  height: 44px;
  border-radius: var(--radius-md);
  font-weight: 600;
}

.secondary {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.primary {
  border: none;
  background: var(--color-primary);
  color: #fff;
}

.error {
  color: var(--color-danger);
  font-size: 13px;
}
</style>
