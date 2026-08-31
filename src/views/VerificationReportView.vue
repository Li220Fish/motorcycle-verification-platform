<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'

import AppHeader from '@/components/common/AppHeader.vue'
import InspectionReportBody from '@/components/verification/InspectionReportBody.vue'
import type { ReportSection } from '@/components/verification/InspectionReportBody.vue'
import { RESULT_LABEL, RESULT_TONE } from '@/data/verification/result-labels'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'

const props = defineProps<{ id: string }>()

const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-TW')
}

const vehicleTitle = computed(() => {
  const vehicle = vehicleStore.currentVehicle
  if (!vehicle) return '—'
  return `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.brand} ${vehicle.model}`.trim()
})

const inspectedDate = computed(() => {
  const verification = verificationStore.currentVerification
  if (!verification) return '—'
  return formatDate(verification.completedAt ?? verification.createdAt)
})

// A real, derived number — not a fabricated demo score: the share of this
// verification's own answered items (excluding 不適用) that came back 正常.
const score = computed<number | null>(() => {
  const eligible = Object.values(verificationStore.answers).filter(
    (answer) => answer.result !== 'not_applicable',
  )
  if (eligible.length === 0) return null
  const normalCount = eligible.filter((answer) => answer.result === 'normal').length
  return Math.round((normalCount / eligible.length) * 100)
})

const sections = computed<ReportSection[]>(() =>
  verificationStore.sections.map((section) => {
    const answers = section.items
      .map((item) => verificationStore.answers[item.id])
      .filter((answer) => !!answer)
    let statusLabel = '尚未檢查'
    let statusTone: ReportSection['statusTone'] = 'neutral'
    if (answers.length > 0) {
      if (answers.some((answer) => answer.result === 'attention')) {
        statusLabel = '需要注意'
        statusTone = 'warning'
      } else if (
        answers.some((answer) => answer.result === 'unsure' || answer.result === 'cannot_check')
      ) {
        statusLabel = '待確認'
        statusTone = 'warning'
      } else {
        statusLabel = '良好'
        statusTone = 'success'
      }
    }

    return {
      id: section.id,
      title: section.title,
      statusLabel,
      statusTone,
      items: section.items.map((item) => {
        const answer = verificationStore.answers[item.id]
        return {
          id: item.id,
          title: item.title,
          description: item.description,
          badgeLabel: answer ? RESULT_LABEL[answer.result] : '未檢查',
          badgeTone: answer ? RESULT_TONE[answer.result] : 'neutral',
          note: answer?.note,
        }
      }),
    }
  }),
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
    <AppHeader title="檢驗報告" back />
    <InspectionReportBody
      :vehicle-title="vehicleTitle"
      :inspected-date="inspectedDate"
      :score="score"
      :sections="sections"
    />
  </div>
</template>
