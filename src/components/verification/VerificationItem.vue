<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AudioEvidenceRecorder from './AudioEvidenceRecorder.vue'
import DocumentEvidenceCapture from './DocumentEvidenceCapture.vue'
import EvidencePreview from './EvidencePreview.vue'
import FormFieldCapture from './FormFieldCapture.vue'
import IssuePhotoCapture from './IssuePhotoCapture.vue'
import PhotoEvidenceCapture from './PhotoEvidenceCapture.vue'
import VerificationHelpSheet from './VerificationHelpSheet.vue'
import VerificationItemHeader from './VerificationItemHeader.vue'
import VerificationResultSelector from './VerificationResultSelector.vue'
import VideoEvidenceCapture from './VideoEvidenceCapture.vue'
import VoltageEvidenceCapture from './VoltageEvidenceCapture.vue'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationItem as VerificationItemData } from '@/data/verification'
import type { AnswerResultValue } from '@/types/verification-evidence'

const props = defineProps<{
  verificationId: string
  item: VerificationItemData
}>()

const verificationStore = useVerificationStore()

const result = ref<AnswerResultValue | null>(null)
const note = ref('')
const cannotCheckReason = ref('')
const formData = ref<Record<string, string>>({})
const helpOpen = ref(false)

function hydrateFromStore(): void {
  const answer = verificationStore.answers[props.item.id]
  result.value = answer?.result ?? null
  note.value = answer?.note ?? ''
  cannotCheckReason.value = answer?.cannotCheckReason ?? ''
  formData.value = answer?.formData ?? {}
}

watch(() => props.item.id, hydrateFromStore, { immediate: true })

function persist(): void {
  if (!result.value) return
  verificationStore.saveAnswer(
    props.item.id,
    result.value,
    note.value || undefined,
    cannotCheckReason.value || undefined,
    Object.keys(formData.value).length > 0 ? formData.value : undefined,
  )
}

function handleResultChange(value: AnswerResultValue): void {
  result.value = value
  persist()
}

function handleCannotCheckReasonChange(value: string): void {
  cannotCheckReason.value = value
  persist()
}

function handleFormDataChange(value: Record<string, string>): void {
  formData.value = value
  // A filled-in record has no "abnormal" judgement of its own — default to
  // 正常 so the table alone marks the item done; the selector below still
  // lets the user flag 需要注意 explicitly (e.g. mismatched ID document).
  if (!result.value) result.value = 'normal'
  persist()
}

function handleNoteBlur(): void {
  if (result.value) persist()
}

const evidenceList = computed(() => verificationStore.evidenceByItem[props.item.id] ?? [])

function handleRemoveEvidence(evidenceId: string): void {
  verificationStore.removeEvidenceLocally(props.item.id, evidenceId)
}
</script>

<template>
  <div class="verification-item">
    <VerificationItemHeader
      :title="item.title"
      :description="item.description"
      :instruction="item.instruction"
      :severity="item.severity"
    >
      <button class="help-trigger" @click="helpOpen = true">不知道怎麼看？</button>
    </VerificationItemHeader>

    <div v-if="item.type === 'form'" class="evidence-block">
      <FormFieldCapture
        :fields="item.formFields ?? []"
        :model-value="formData"
        @update:model-value="handleFormDataChange"
      />
    </div>
    <div v-else-if="item.type === 'photo'" class="evidence-block">
      <PhotoEvidenceCapture
        :verification-id="verificationId"
        :item-id="item.id"
        :label="item.evidence?.[0]?.label ?? item.title"
      />
    </div>
    <div v-else-if="item.type === 'video'" class="evidence-block">
      <VideoEvidenceCapture
        :verification-id="verificationId"
        :item-id="item.id"
        :label="item.evidence?.[0]?.label ?? item.title"
      />
    </div>
    <div v-else-if="item.type === 'audio'" class="evidence-block">
      <AudioEvidenceRecorder :verification-id="verificationId" :item-id="item.id" />
    </div>
    <div v-else-if="item.type === 'voltage'" class="evidence-block">
      <VoltageEvidenceCapture
        :verification-id="verificationId"
        :item-id="item.id"
        :label="item.title"
      />
    </div>
    <div v-else-if="item.type === 'document'" class="evidence-block">
      <DocumentEvidenceCapture :verification-id="verificationId" :item-id="item.id" />
    </div>

    <EvidencePreview
      v-if="evidenceList.length > 0"
      :evidence="evidenceList"
      @remove="handleRemoveEvidence"
    />

    <VerificationResultSelector
      :options="item.options"
      :model-value="result"
      :cannot-check-reason="cannotCheckReason"
      @update:model-value="handleResultChange"
      @update:cannot-check-reason="handleCannotCheckReasonChange"
    />

    <IssuePhotoCapture
      v-if="result === 'attention' && item.type !== 'photo'"
      :verification-id="verificationId"
      :item-id="item.id"
    />

    <label class="note-field">
      <span>備註（選填）</span>
      <textarea v-model="note" rows="1" placeholder="補充說明..." @blur="handleNoteBlur" />
    </label>

    <VerificationHelpSheet
      :open="helpOpen"
      :title="item.title"
      :content="item.helpText ?? `${item.description} ${item.instruction ?? ''}`.trim()"
      @close="helpOpen = false"
    />
  </div>
</template>

<style scoped>
.verification-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.help-trigger {
  flex: 0 0 auto;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  padding: 0;
  white-space: nowrap;
}

.evidence-block {
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.note-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.note-field textarea {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px var(--space-md);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  color: var(--color-text-primary);
  min-height: 34px;
}
</style>
