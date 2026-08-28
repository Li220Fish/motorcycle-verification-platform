<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ReportSection from '@/components/common/ReportSection.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EvidencePreview from '@/components/verification/EvidencePreview.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { AnswerResultValue } from '@/types/verification-evidence'

const props = defineProps<{ id: string }>()

const authStore = useAuthStore()
const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()

const activeTab = ref<'summary' | 'checklist' | 'photos' | 'videos'>('summary')
const tabs: Array<{ key: typeof activeTab.value; label: string }> = [
  { key: 'summary', label: '摘要' },
  { key: 'checklist', label: '檢查項目' },
  { key: 'photos', label: '照片' },
  { key: 'videos', label: '影片' },
]

const typeLabel: Record<string, string> = {
  seller: '賣家驗證',
  buyer: '買家複驗',
  professional: '專業驗證',
}

const resultLabel: Record<AnswerResultValue, string> = {
  normal: '正常',
  attention: '需要注意',
  unsure: '不確定',
  not_applicable: '不適用',
  cannot_check: '無法檢查',
}

const resultTone: Record<AnswerResultValue, 'success' | 'warning' | 'neutral'> = {
  normal: 'success',
  attention: 'warning',
  unsure: 'warning',
  not_applicable: 'neutral',
  cannot_check: 'neutral',
}

const verifierName = computed(() => {
  const verification = verificationStore.currentVerification
  if (!verification) return '—'
  if (verification.userId === authStore.user?.id) {
    return authStore.user?.displayName || authStore.user?.email || '—'
  }
  // Resolving another user's display name requires a users-lookup service
  // that doesn't exist yet — see src/services/firebase/auth.service.ts.
  return '其他使用者'
})

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const voltageStages = computed(() =>
  verificationStore.flatItems
    .filter((flat) => flat.item.type === 'voltage')
    .map((flat) => {
      const evidence = verificationStore.evidenceByItem[flat.item.id]?.[0]
      const voltage = evidence?.metadata?.voltage
      return {
        label: flat.item.title,
        value: typeof voltage === 'number' ? `${voltage.toFixed(2)} V` : '尚未記錄',
      }
    }),
)

const checklistRows = computed(() =>
  verificationStore.flatItems
    .filter((flat) => verificationStore.answers[flat.item.id])
    .map((flat) => ({
      itemId: flat.item.id,
      title: flat.item.title,
      sectionTitle: flat.section.title,
      answer: verificationStore.answers[flat.item.id],
    })),
)

const photoEvidence = computed(() =>
  Object.values(verificationStore.evidenceByItem)
    .flat()
    .filter((evidence) => evidence.type === 'photo'),
)
const videoEvidence = computed(() =>
  Object.values(verificationStore.evidenceByItem)
    .flat()
    .filter((evidence) => evidence.type === 'video'),
)

watch(
  () => verificationStore.currentVerification?.vehicleId,
  (vehicleId) => {
    if (vehicleId) vehicleStore.fetchVehicle(vehicleId)
  },
)

onMounted(() => {
  verificationStore.loadFlow(props.id)
})
</script>

<template>
  <div>
    <AppHeader title="驗證報告" back />

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="content">
      <template v-if="activeTab === 'summary'">
        <ReportSection title="車輛資訊">
          <div class="row">
            <span>車輛</span>
            <span>
              {{ vehicleStore.currentVehicle?.brand }} {{ vehicleStore.currentVehicle?.model }}
            </span>
          </div>
          <div class="row">
            <span>年份</span>
            <span>{{ vehicleStore.currentVehicle?.year ?? '—' }}</span>
          </div>
          <div class="row">
            <span>里程</span>
            <span>{{ vehicleStore.currentVehicle?.mileage?.toLocaleString() ?? '—' }} km</span>
          </div>
          <div class="row">
            <span>驗證類型</span>
            <span>{{ typeLabel[verificationStore.currentVerification?.type ?? ''] ?? '—' }}</span>
          </div>
          <div class="row">
            <span>驗證時間</span>
            <span>{{
              verificationStore.currentVerification
                ? formatDateTime(verificationStore.currentVerification.createdAt)
                : '—'
            }}</span>
          </div>
          <div class="row">
            <span>驗證者</span>
            <span>{{ verifierName }}</span>
          </div>
        </ReportSection>

        <ReportSection title="電壓檢測結果">
          <div v-for="stage in voltageStages" :key="stage.label" class="row">
            <span>{{ stage.label }}</span>
            <span>{{ stage.value }}</span>
          </div>
          <p v-if="voltageStages.length === 0" class="hint">此驗證尚未包含電壓檢測項目。</p>
          <p v-else class="mock-caption">
            數值來自 Voltage Probe 實測讀數；正常／異常的自動判定邏輯尚未實作。
          </p>
        </ReportSection>
      </template>

      <template v-else-if="activeTab === 'checklist'">
        <EmptyState
          v-if="checklistRows.length === 0"
          title="尚無檢查紀錄"
          description="開始驗證後，已完成的項目會顯示於此。"
        />
        <div v-else class="checklist">
          <div v-for="row in checklistRows" :key="row.itemId" class="checklist-row">
            <div class="checklist-text">
              <p class="checklist-title">{{ row.title }}</p>
              <p class="checklist-section">{{ row.sectionTitle }}</p>
              <p v-if="row.answer.note" class="checklist-note">備註：{{ row.answer.note }}</p>
            </div>
            <StatusBadge :tone="resultTone[row.answer.result]">{{
              resultLabel[row.answer.result]
            }}</StatusBadge>
          </div>
        </div>
      </template>

      <template v-else-if="activeTab === 'photos'">
        <EmptyState
          v-if="photoEvidence.length === 0"
          title="尚無照片"
          description="上傳的照片將顯示於此。"
        />
        <EvidencePreview v-else :evidence="photoEvidence" readonly @remove="() => {}" />
      </template>

      <template v-else>
        <EmptyState
          v-if="videoEvidence.length === 0"
          title="尚無影片"
          description="上傳的影片將顯示於此。"
        />
        <EvidencePreview v-else :evidence="videoEvidence" readonly @remove="() => {}" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 0 var(--space-md);
}

.tab {
  padding: var(--space-md) var(--space-sm);
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-disabled);
  border-bottom: 2px solid transparent;
  margin-right: var(--space-md);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.row span:first-child {
  color: var(--color-text-secondary);
}

.hint,
.mock-caption {
  font-size: 11px;
  color: var(--color-text-disabled);
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.checklist-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.checklist-title {
  font-size: 14px;
  font-weight: 700;
}

.checklist-section {
  font-size: 11px;
  color: var(--color-text-disabled);
}

.checklist-note {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
</style>
