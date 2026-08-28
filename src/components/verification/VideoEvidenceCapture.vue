<script setup lang="ts">
import { ref } from 'vue'

import { cameraService } from '@/services/media/camera.service'
import { platformService } from '@/services/platform/platform.service'
import { storageService } from '@/services/firebase/storage.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = defineProps<{
  verificationId: string
  itemId: string
  label: string
}>()

const isNative = platformService.isNative()
const countdown = ref<number | null>(null)
const previewUrl = ref('')
const uploading = ref(false)
const errorMessage = ref('')
let capturedBlob: Blob | null = null

function runCountdown(): Promise<void> {
  return new Promise((resolve) => {
    countdown.value = 3
    const tick = () => {
      if (countdown.value === null || countdown.value <= 1) {
        countdown.value = null
        resolve()
        return
      }
      countdown.value -= 1
      setTimeout(tick, 800)
    }
    setTimeout(tick, 800)
  })
}

async function handleStart(): Promise<void> {
  errorMessage.value = ''
  await runCountdown()
  try {
    const result = await cameraService.recordVideo()
    if (!result.webPath) throw new Error('未取得影片')
    const blob = await fetch(result.webPath).then((response) => response.blob())
    capturedBlob = blob
    previewUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '錄影失敗'
  }
}

function handleWebFileChange(event: Event): void {
  errorMessage.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  capturedBlob = file
  previewUrl.value = URL.createObjectURL(file)
}

function handleRetake(): void {
  previewUrl.value = ''
  capturedBlob = null
}

async function handleConfirm(): Promise<void> {
  if (!capturedBlob) return
  uploading.value = true
  errorMessage.value = ''
  try {
    let remoteUrl: string | undefined
    try {
      remoteUrl = await storageService.uploadFile(
        'verification-videos',
        capturedBlob,
        `${props.itemId}-${Date.now()}.mp4`,
      )
    } catch {
      remoteUrl = undefined
    }
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId: props.itemId,
      type: 'video',
      localUri: previewUrl.value,
      remoteUrl,
      createdAt: Date.now(),
      captureSource: isNative ? 'camera' : 'file',
      captureTimestamp: Date.now(),
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
  <div class="video-capture">
    <template v-if="countdown !== null">
      <div class="countdown">{{ countdown }}</div>
      <p class="hint">倒數結束後將開啟相機，請立即發動機車並怠速 20 秒</p>
    </template>
    <template v-else-if="!previewUrl">
      <p class="instructions">請將手機固定在拍攝位置，準備好後開始倒數</p>
      <button v-if="isNative" class="capture-button" @click="handleStart">
        開始錄影：{{ label }}
      </button>
      <label v-else class="capture-button file-button">
        開始錄影：{{ label }}
        <input type="file" accept="video/*" capture="environment" @change="handleWebFileChange" />
      </label>
    </template>
    <template v-else>
      <video :src="previewUrl" controls class="preview-video" />
      <div class="preview-actions">
        <button class="secondary" @click="handleRetake">重新錄製</button>
        <button class="primary" :disabled="uploading" @click="handleConfirm">
          {{ uploading ? '儲存中...' : '確認影片' }}
        </button>
      </div>
    </template>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.video-capture {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.countdown {
  text-align: center;
  font-size: 56px;
  font-weight: 700;
  color: var(--color-primary);
  padding: var(--space-lg) 0;
}

.instructions,
.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
}

.capture-button {
  position: relative;
  height: 46px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary);
  background: #e8f1fd;
  color: var(--color-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.file-button input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.preview-video {
  width: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
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
