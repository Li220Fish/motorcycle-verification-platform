<script setup lang="ts">
import { ref } from 'vue'

import PhotoGuide from './PhotoGuide.vue'
import { cameraService } from '@/services/media/camera.service'
import { storageService } from '@/services/firebase/storage.service'
import { mockRecognitionService } from '@/services/recognition/mock-recognition.service'
import type { RecognitionStatus } from '@/services/recognition/recognition.types'
import { useVerificationStore } from '@/stores/verification.store'
import type { AiCheckKind } from '@/data/verification'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = withDefaults(
  defineProps<{
    verificationId: string
    itemId: string
    label: string
    allowIssueMark?: boolean
    markAsIssuePhoto?: boolean
    /** When set, offers a mocked "影像輔助分析" pass after capture — same
     * idea as DocumentEvidenceCapture.vue's, just for a plain checklist
     * photo rather than a document. Absent entirely on items with no
     * `aiCheck` in the data (§4 of the checklist spec — most 車身外觀 items
     * carry one, most other items don't). */
    aiCheck?: AiCheckKind
    /** Skip the 重新拍攝/確認照片 review step entirely — as soon as the
     * camera returns a photo, save it immediately (拍完就是完成). Used for
     * 車身外觀's pure-photo items, where taking the photo IS the whole task;
     * a bad shot is still fixable afterward via delete+retake on revisit
     * (EvidencePreview.vue), so nothing is lost by skipping the review tap. */
    autoConfirm?: boolean
  }>(),
  { allowIssueMark: false, markAsIssuePhoto: false, aiCheck: undefined, autoConfirm: false },
)

const verificationStore = useVerificationStore()

const previewUrl = ref('')
const uploading = ref(false)
const errorMessage = ref('')
const issuePosition = ref<{ x: number; y: number } | null>(null)
const recognitionStatus = ref<RecognitionStatus>('idle')
const recognitionFindings = ref<string[]>([])

async function handleAnalyze(): Promise<void> {
  recognitionStatus.value = 'analyzing'
  const result = await mockRecognitionService.analyzeImage({
    itemId: props.itemId,
    imageUri: previewUrl.value,
  })
  recognitionStatus.value = result.status
  recognitionFindings.value = result.findings
}

async function handleTakePhoto(): Promise<void> {
  errorMessage.value = ''
  issuePosition.value = null
  try {
    const result = await cameraService.takePhoto()
    previewUrl.value = result.webPath ?? ''
    if (props.autoConfirm && previewUrl.value) {
      await handleConfirm()
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '拍照失敗'
  }
}

function handleRetake(): void {
  previewUrl.value = ''
  issuePosition.value = null
  recognitionStatus.value = 'idle'
  recognitionFindings.value = []
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
      remoteUrl = await storageService.uploadEvidenceFile(
        props.verificationId,
        props.itemId,
        blob,
        'jpg',
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
    recognitionStatus.value = 'idle'
    recognitionFindings.value = []
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

      <template v-if="aiCheck && !autoConfirm">
        <button v-if="recognitionStatus === 'idle'" class="secondary ai-btn" @click="handleAnalyze">
          影像輔助分析
        </button>
        <p v-else-if="recognitionStatus === 'analyzing'" class="analyzing">分析中...</p>
        <div v-else-if="recognitionStatus !== 'error'" class="findings">
          <p v-for="finding in recognitionFindings" :key="finding">• {{ finding }}</p>
          <p class="mock-caption">此功能目前為測試模式，結果不作為正式車況判定。</p>
        </div>
      </template>

      <p v-if="autoConfirm" class="uploading-hint">{{ uploading ? '儲存中...' : '' }}</p>
      <div v-else class="preview-actions">
        <button class="secondary" :disabled="uploading" @click="handleRetake">重新拍攝</button>
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

.ai-btn {
  height: 40px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 13px;
}

.analyzing {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
}

.findings {
  background: var(--color-background);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-primary);
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

.uploading-hint {
  margin: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
</style>
