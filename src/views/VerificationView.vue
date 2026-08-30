<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronRight, ShieldCheck, UserCheck, Wrench } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationType } from '@/types/verification'

const authStore = useAuthStore()
const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()
const router = useRouter()
const route = useRoute()

const selectedVehicleId = ref('')
const submitting = ref(false)
const errorMessage = ref('')

// Arriving from a role Home's own CTA (e.g. Seller's "開始車況驗證") already
// tells us the type — re-asking buyer/seller here would be exactly the
// "先找車輛→再找 Verification→再找開始" friction the Home redesign was
// meant to remove. Only fall back to the picker when arriving without that
// context (e.g. the bottom-nav "驗證" tab).
const presetType = computed<VerificationType | null>(() => {
  const value = route.query.type
  return value === 'seller' || value === 'buyer' ? value : null
})

const verificationTypes: Array<{
  type: VerificationType
  title: string
  subtitle: string
  description: string
  icon: typeof UserCheck
  disabled?: boolean
}> = [
  {
    type: 'seller',
    title: '賣家驗證',
    subtitle: 'Seller Verification',
    description: '完整檢查車況，建立可分享給買家的驗證報告。',
    icon: UserCheck,
  },
  {
    type: 'buyer',
    title: '買家複驗',
    subtitle: 'Buyer Re-verification',
    description: '查看賣家驗證資料，並確認現場車況是否一致。',
    icon: ShieldCheck,
  },
  {
    type: 'professional',
    title: '專業驗證',
    subtitle: 'Professional Verification',
    description: '未來功能，由專業技師進行深入的檢測與評估。',
    icon: Wrench,
    disabled: true,
  },
]

const canStart = computed(() => Boolean(selectedVehicleId.value) && !submitting.value)
const presetTypeMeta = computed(
  () => verificationTypes.find((item) => item.type === presetType.value) ?? null,
)

async function handleSelectType(type: VerificationType): Promise<void> {
  if (type === 'professional') return
  if (!selectedVehicleId.value) {
    errorMessage.value = '請先選擇車輛'
    return
  }
  if (!authStore.user) return

  submitting.value = true
  errorMessage.value = ''
  try {
    let relatedVerificationId: string | undefined
    if (type === 'buyer') {
      await verificationStore.fetchByVehicle(selectedVehicleId.value)
      relatedVerificationId = verificationStore.verifications.find(
        (verification) => verification.type === 'seller' && verification.status === 'completed',
      )?.id
    }

    const id = await verificationStore.createVerification({
      vehicleId: selectedVehicleId.value,
      userId: authStore.user.id,
      type,
      status: 'draft',
      relatedVerificationId,
    })
    router.push(`/verification/${id}`)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '建立驗證失敗'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await vehicleStore.fetchVehicles()
  const queryVehicleId = typeof route.query.vehicleId === 'string' ? route.query.vehicleId : ''
  selectedVehicleId.value = queryVehicleId || vehicleStore.vehicles[0]?.id || ''
})
</script>

<template>
  <div>
    <AppHeader :title="presetTypeMeta ? presetTypeMeta.title : '開始驗證'" />

    <div class="content">
      <label class="field">
        <span>選擇車輛</span>
        <select v-model="selectedVehicleId">
          <option v-if="vehicleStore.vehicles.length === 0" value="">尚無車輛，請先新增</option>
          <option v-for="vehicle in vehicleStore.vehicles" :key="vehicle.id" :value="vehicle.id">
            {{ vehicle.brand }} {{ vehicle.model }}
          </option>
        </select>
      </label>

      <template v-if="presetTypeMeta">
        <div class="preset-summary">
          <div class="type-icon">
            <component :is="presetTypeMeta.icon" :size="22" color="var(--color-primary)" />
          </div>
          <div class="type-info">
            <p class="type-title">{{ presetTypeMeta.title }}</p>
            <p class="type-description">{{ presetTypeMeta.description }}</p>
          </div>
        </div>
        <PrimaryButton block :disabled="!canStart" @click="handleSelectType(presetTypeMeta.type)">
          {{ submitting ? '處理中...' : '開始' }}
        </PrimaryButton>
      </template>

      <template v-else>
        <p class="question">您要進行哪種類型的驗證？</p>

        <div class="type-list">
          <button
            v-for="item in verificationTypes"
            :key="item.type"
            class="type-card"
            :disabled="item.disabled || !canStart"
            @click="handleSelectType(item.type)"
          >
            <div class="type-icon">
              <component :is="item.icon" :size="22" color="var(--color-primary)" />
            </div>
            <div class="type-info">
              <p class="type-title">
                {{ item.title }}
                <StatusBadge v-if="item.disabled" tone="neutral">未來功能</StatusBadge>
              </p>
              <p class="type-subtitle">{{ item.subtitle }}</p>
              <p class="type-description">{{ item.description }}</p>
            </div>
            <ChevronRight :size="20" color="var(--color-text-disabled)" />
          </button>
        </div>
      </template>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <p class="hint">完整驗證約需 20～30 分鐘</p>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.field select {
  height: 46px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--color-text-primary);
  background: var(--color-surface);
}

.question {
  font-size: 16px;
  font-weight: 700;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.preset-summary {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.type-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.type-card:disabled {
  opacity: 0.55;
}

.type-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: #e8f1fd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.type-subtitle {
  font-size: 12px;
  color: var(--color-text-disabled);
  margin-top: 1px;
}

.type-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.error {
  color: var(--color-danger);
  font-size: 14px;
}

.hint {
  text-align: center;
  color: var(--color-text-disabled);
  font-size: 13px;
}
</style>
