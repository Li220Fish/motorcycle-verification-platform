<script setup lang="ts">
import { ref } from 'vue'

import { cameraService } from '@/services/media/camera.service'
import { storageService } from '@/services/firebase/storage.service'
import { mockRecognitionService } from '@/services/recognition/mock-recognition.service'
import type { RecognitionStatus } from '@/services/recognition/recognition.types'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = defineProps<{
  verificationId: string
  itemId: string
}>()

const previewUrl = ref('')
const uploading = ref(false)
const errorMessage = ref('')
const recognitionStatus = ref<RecognitionStatus>('idle')
const recognitionFields = ref<Record<string, string>>({})

async function handleCapture(): Promise<void> {
  errorMessage.value = ''
  try {
    const result = await cameraService.takePhoto()
    previewUrl.value = result.webPath ?? ''
    recognitionStatus.value = 'idle'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '拍照失敗'
  }
}

async function handleAnalyze(): Promise<void> {
  recognitionStatus.value = 'analyzing'
  const result = await mockRecognitionService.analyzeDocument({
    itemId: props.itemId,
    imageUri: previewUrl.value,
  })
  recognitionStatus.value = result.status
  recognitionFields.value = result.fields ?? {}
}

async function handleConfirm(): Promise<void> {
  if (!previewUrl.value) return
  uploading.value = true
  try {
    const blob = await fetch(previewUrl.value).then((response) => response.blob())
    let remoteUrl: string | undefined
    try {
      remoteUrl = await storageService.uploadFile(
        'vehicle-images',
        blob,
        `${props.itemId}-doc-${Date.now()}.jpg`,
      )
    } catch {
      remoteUrl = undefined
    }
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId: props.itemId,
      type: 'photo',
      localUri: previewUrl.value,
      remoteUrl,
      createdAt: Date.now(),
      captureSource: 'camera',
      captureTimestamp: Date.now(),
      metadata: { evidenceKind: 'document', recognizedFields: recognitionFields.value },
    }
    await useVerificationStore().addEvidence(evidence)
    previewUrl.value = ''
    recognitionStatus.value = 'idle'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="document-capture">
    <template v-if="!previewUrl">
      <button class="capture-button" @click="handleCapture">拍攝文件</button>
    </template>
    <template v-else>
      <img :src="previewUrl" alt="Document evidence" class="preview" />

      <button
        v-if="recognitionStatus === 'idle'"
        class="capture-button secondary"
        @click="handleAnalyze"
      >
        影像輔助分析
      </button>
      <p v-else-if="recognitionStatus === 'analyzing'" class="analyzing">Analyzing...</p>
      <div v-else-if="recognitionStatus === 'completed'" class="fields">
        <div v-for="(value, key) in recognitionFields" :key="key" class="field-row">
          <span>{{ key }}</span>
          <span>{{ value }}</span>
        </div>
        <p class="mock-caption">此功能目前為測試模式，結果不作為正式車況判定。</p>
      </div>

      <div class="preview-actions">
        <button class="secondary" @click="previewUrl = ''">重新拍攝</button>
        <button class="primary" :disabled="uploading" @click="handleConfirm">
          {{ uploading ? '儲存中...' : '確認文件' }}
        </button>
      </div>
    </template>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.document-capture {
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

.capture-button.secondary {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.preview {
  width: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.analyzing {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
}

.fields {
  background: var(--color-background);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.mock-caption {
  font-size: 11px;
  color: var(--color-text-disabled);
  margin-top: 4px;
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
