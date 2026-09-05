<script setup lang="ts">
import { ref } from 'vue'
import { FileText } from 'lucide-vue-next'

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

type Pending = { kind: 'photo'; previewUrl: string } | { kind: 'pdf'; file: File }

const pending = ref<Pending | null>(null)
const uploading = ref(false)
const errorMessage = ref('')
const recognitionStatus = ref<RecognitionStatus>('idle')
const recognitionFields = ref<Record<string, string>>({})
const fileInput = ref<HTMLInputElement | null>(null)

async function handleCapture(): Promise<void> {
  errorMessage.value = ''
  try {
    const result = await cameraService.takePhoto()
    pending.value = { kind: 'photo', previewUrl: result.webPath ?? '' }
    recognitionStatus.value = 'idle'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '拍照失敗'
  }
}

function openFilePicker(): void {
  fileInput.value?.click()
}

function handleFileChange(event: Event): void {
  errorMessage.value = ''
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf') {
    errorMessage.value = '請選擇 PDF 檔案'
    return
  }
  pending.value = { kind: 'pdf', file }
  recognitionStatus.value = 'idle'
}

async function handleAnalyze(): Promise<void> {
  if (pending.value?.kind !== 'photo') return
  recognitionStatus.value = 'analyzing'
  const result = await mockRecognitionService.analyzeDocument({
    itemId: props.itemId,
    imageUri: pending.value.previewUrl,
  })
  recognitionStatus.value = result.status
  recognitionFields.value = result.fields ?? {}
}

function handleReset(): void {
  pending.value = null
  recognitionStatus.value = 'idle'
  if (fileInput.value) fileInput.value.value = ''
}

async function handleConfirm(): Promise<void> {
  if (!pending.value) return
  uploading.value = true
  try {
    const source = pending.value
    const blob =
      source.kind === 'photo' ? await fetch(source.previewUrl).then((r) => r.blob()) : source.file
    const extension = source.kind === 'photo' ? 'jpg' : 'pdf'

    let remoteUrl: string | undefined
    try {
      remoteUrl = await storageService.uploadEvidenceFile(
        props.verificationId,
        `${props.itemId}-doc`,
        blob,
        extension,
      )
    } catch {
      remoteUrl = undefined
    }
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId: props.itemId,
      type: 'document',
      localUri: source.kind === 'photo' ? source.previewUrl : undefined,
      remoteUrl,
      createdAt: Date.now(),
      captureSource: source.kind === 'photo' ? 'camera' : 'file',
      captureTimestamp: Date.now(),
      metadata: {
        sourceFormat: source.kind,
        fileName: source.kind === 'pdf' ? source.file.name : undefined,
        recognizedFields:
          source.kind === 'photo' && recognitionStatus.value === 'completed'
            ? recognitionFields.value
            : undefined,
      },
    }
    await useVerificationStore().addEvidence(evidence)
    handleReset()
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="document-capture">
    <template v-if="!pending">
      <div class="source-buttons">
        <button class="capture-button" @click="handleCapture">拍攝文件</button>
        <button class="capture-button secondary" @click="openFilePicker">上傳 PDF</button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="application/pdf"
        class="hidden-input"
        @change="handleFileChange"
      />
    </template>
    <template v-else-if="pending.kind === 'photo'">
      <img :src="pending.previewUrl" alt="Document evidence" class="preview" />

      <button
        v-if="recognitionStatus === 'idle'"
        class="capture-button secondary"
        @click="handleAnalyze"
      >
        影像輔助分析
      </button>
      <p v-else-if="recognitionStatus === 'analyzing'" class="analyzing">分析中...</p>
      <div v-else-if="recognitionStatus === 'completed'" class="fields">
        <div v-for="(value, key) in recognitionFields" :key="key" class="field-row">
          <span>{{ key }}</span>
          <span>{{ value }}</span>
        </div>
        <p class="mock-caption">此功能目前為測試模式，結果不作為正式車況判定。</p>
      </div>

      <div class="preview-actions">
        <button class="secondary" @click="handleReset">重新選擇</button>
        <button class="primary" :disabled="uploading" @click="handleConfirm">
          {{ uploading ? '儲存中...' : '確認文件' }}
        </button>
      </div>
    </template>
    <template v-else>
      <div class="pdf-preview">
        <FileText :size="28" />
        <span>{{ pending.file.name }}</span>
      </div>
      <div class="preview-actions">
        <button class="secondary" @click="handleReset">重新選擇</button>
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

.source-buttons {
  display: flex;
  gap: var(--space-sm);
}

.source-buttons .capture-button {
  flex: 1;
}

.hidden-input {
  display: none;
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

.pdf-preview {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
  word-break: break-all;
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
