<script setup lang="ts">
import { ref } from 'vue'

import PhotoGuide from './PhotoGuide.vue'
import { cameraService } from '@/services/media/camera.service'
import { storageService } from '@/services/firebase/storage.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = withDefaults(
  defineProps<{
    verificationId: string
    itemId: string
    label: string
    allowIssueMark?: boolean
    markAsIssuePhoto?: boolean
  }>(),
  { allowIssueMark: false, markAsIssuePhoto: false },
)

const verificationStore = useVerificationStore()

const previewUrl = ref('')
const uploading = ref(false)
const errorMessage = ref('')
const issuePosition = ref<{ x: number; y: number } | null>(null)

async function handleTakePhoto(): Promise<void> {
  errorMessage.value = ''
  issuePosition.value = null
  try {
    const result = await cameraService.takePhoto()
    previewUrl.value = result.webPath ?? ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '拍照失敗'
  }
}

function handleRetake(): void {
  previewUrl.value = ''
  issuePosition.value = null
}

function handleMarkIssue(event: MouseEvent): void {
  if (!props.allowIssueMark) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  issuePosition.value = {
    x: Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(1)),
    y: Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(1)),
  }
}

async function handleConfirm(): Promise<void> {
  if (!previewUrl.value) return
  uploading.value = true
  errorMessage.value = ''
  try {
    const blob = await fetch(previewUrl.value).then((response) => response.blob())
    let remoteUrl: string | undefined
    try {
      remoteUrl = await storageService.uploadFile(
        props.markAsIssuePhoto ? 'verification-images' : 'vehicle-images',
        blob,
        `${props.itemId}-${Date.now()}.jpg`,
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
      metadata: {
        ...(props.markAsIssuePhoto ? { evidenceKind: 'issue_photo' } : {}),
        ...(issuePosition.value ? { issuePosition: issuePosition.value } : {}),
      },
    }
    await verificationStore.addEvidence(evidence)
    previewUrl.value = ''
    issuePosition.value = null
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="photo-capture">
    <template v-if="!previewUrl">
      <PhotoGuide :label="label" :item-id="itemId" />
      <button class="capture-button" @click="handleTakePhoto">請拍攝：{{ label }}</button>
    </template>
    <template v-else>
      <div class="preview-wrap" @click="handleMarkIssue">
        <img :src="previewUrl" alt="Captured evidence" />
        <span
          v-if="issuePosition"
          class="issue-marker"
          :style="{ left: `${issuePosition.x}%`, top: `${issuePosition.y}%` }"
        />
      </div>
      <p v-if="allowIssueMark" class="hint">點擊照片可標記問題位置（選填）</p>
      <div class="preview-actions">
        <button class="secondary" @click="handleRetake">重新拍攝</button>
        <button class="primary" :disabled="uploading" @click="handleConfirm">
          {{ uploading ? '儲存中...' : '確認照片' }}
        </button>
      </div>
    </template>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.photo-capture {
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

.preview-wrap {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  cursor: crosshair;
}

.preview-wrap img {
  display: block;
  width: 100%;
}

.issue-marker {
  position: absolute;
  width: 16px;
  height: 16px;
  margin-left: -8px;
  margin-top: -8px;
  border-radius: 999px;
  background: var(--color-danger);
  border: 2px solid #fff;
}

.hint {
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
