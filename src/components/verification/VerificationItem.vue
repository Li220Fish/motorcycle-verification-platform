<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AudioEvidenceRecorder from './AudioEvidenceRecorder.vue'
import DocumentEvidenceCapture from './DocumentEvidenceCapture.vue'
import EvidencePreview from './EvidencePreview.vue'
import FormFieldCapture from './FormFieldCapture.vue'
import IssuePhotoCapture from './IssuePhotoCapture.vue'
import MotionEvidenceCapture from './MotionEvidenceCapture.vue'
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
// Photo checklist items (車身外觀) are pure evidence-collection: the task IS
// the photo. Forcing a redundant "正常" tap after every one of 20 photos is
// exactly the P1 "拍完就是完成" issue in the UX report. This only flips the
// result selector open when the user actively opts into flagging a problem —
// it never silently claims 正常 was judged, it just stops asking for it.
const flaggingIssue = ref(false)
// Note field is collapsed by default — most items never need one, so it
// shouldn't cost a glance/tap-past on every single screen (P1 §23).
const noteOpen = ref(false)

function hydrateFromStore(): void {
  const answer = verificationStore.answers[props.item.id]
  result.value = answer?.result ?? null
  note.value = answer?.note ?? ''
  cannotCheckReason.value = answer?.cannotCheckReason ?? ''
  formData.value = answer?.formData ?? {}
  flaggingIssue.value = answer?.result === 'attention'
  // Re-expand automatically when a saved note already exists so it's never
  // hidden behind the toggle on a re-visit.
  noteOpen.value = !!note.value
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

// Photo evidence is data-driven via item.evidence rather than a single
// hardcoded "type: photo" branch — this lets ANY item type (form, check...)
// also carry a required/optional supporting photo, not just dedicated
// photo-checklist items.
const photoEvidenceRequirements = computed(
  () => props.item.evidence?.filter((requirement) => requirement.kind === 'photo') ?? [],
)

const isPurePhotoItem = computed(() => props.item.type === 'photo')

watch(evidenceList, (list) => {
  if (isPurePhotoItem.value && list.length > 0 && !result.value && !flaggingIssue.value) {
    handleResultChange('normal')
  }
})

function handleFlagIssue(): void {
  flaggingIssue.value = true
}

function handleUnflagIssue(): void {
  flaggingIssue.value = false
  if (evidenceList.value.length > 0) handleResultChange('normal')
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
    <div v-else-if="item.type === 'motion'" class="evidence-block">
      <MotionEvidenceCapture
        :verification-id="verificationId"
        :item-id="item.id"
        :label="item.title"
      />
    </div>

    <template v-if="!isPurePhotoItem || flaggingIssue || !result">
      <div
        v-for="requirement in photoEvidenceRequirements"
        :key="requirement.label"
        class="evidence-block"
      >
        <PhotoEvidenceCapture
          :verification-id="verificationId"
          :item-id="item.id"
          :label="requirement.label"
        />
      </div>
    </template>

    <EvidencePreview
      v-if="evidenceList.length > 0"
      :evidence="evidenceList"
      @remove="handleRemoveEvidence"
    />

    <div v-if="isPurePhotoItem && !flaggingIssue" class="photo-done-row">
      <span v-if="result" class="photo-done-badge">✓ 已完成</span>
      <span v-else class="photo-done-hint">拍攝完成後自動標記完成</span>
      <button class="flag-issue-btn" @click="handleFlagIssue">標記異常</button>
    </div>
    <template v-else-if="isPurePhotoItem">
      <VerificationResultSelector
        :options="item.options"
        :model-value="result"
        :cannot-check-reason="cannotCheckReason"
        @update:model-value="handleResultChange"
        @update:cannot-check-reason="handleCannotCheckReasonChange"
      />
      <button class="flag-issue-btn ghost" @click="handleUnflagIssue">取消異常標記</button>
    </template>
    <VerificationResultSelector
      v-else
      :options="item.options"
      :model-value="result"
      :cannot-check-reason="cannotCheckReason"
      @update:model-value="handleResultChange"
      @update:cannot-check-reason="handleCannotCheckReasonChange"
    />

    <IssuePhotoCapture
      v-if="result === 'attention' && photoEvidenceRequirements.length === 0"
      :verification-id="verificationId"
      :item-id="item.id"
    />

    <button v-if="!noteOpen" class="add-note-btn" @click="noteOpen = true">＋新增備註</button>
    <label v-else class="note-field">
      <span>備註（選填）</span>
      <textarea
        v-model="note"
        rows="1"
        placeholder="補充說明..."
        autofocus
        @blur="handleNoteBlur"
      />
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

.photo-done-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.photo-done-badge {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-success);
}

.photo-done-hint {
  font-size: 12px;
  color: var(--color-text-disabled);
}

.flag-issue-btn {
  margin-left: auto;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  flex: 0 0 auto;
}

.flag-issue-btn.ghost {
  margin-left: 0;
  border: none;
  color: var(--color-primary);
  padding: 4px 0;
}

.add-note-btn {
  align-self: flex-start;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 0;
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
