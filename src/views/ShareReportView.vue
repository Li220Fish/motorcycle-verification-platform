<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { QrCode } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'

const props = defineProps<{ id: string }>()

const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()

const typeLabel: Record<string, string> = {
  seller: '車輛驗證報告',
  buyer: '買家複驗報告',
  professional: '專業驗證報告',
}

const copyState = ref<'idle' | 'copied'>('idle')
const notice = ref('')

// MOCK: this app has no public, unauthenticated report host yet — every
// route here requires login (see src/router/index.ts). Real sharing needs a
// public report page + relaxed Firestore rules for that one document, which
// is a deliberate follow-up, not something to bolt on during a UI pass.
const shareLink = computed(() => `https://motoverify.app/report/${props.id}`)

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-TW')
}

async function handleCopyLink(): Promise<void> {
  await navigator.clipboard.writeText(shareLink.value)
  copyState.value = 'copied'
  setTimeout(() => {
    copyState.value = 'idle'
  }, 2000)
}

async function handleShareMore(): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'MotoVerify 驗證報告', url: shareLink.value })
    } catch {
      // user cancelled the native share sheet — nothing to do
    }
    return
  }
  handleUnavailable('分享')
}

function handleUnavailable(channel: string): void {
  notice.value = `${channel}分享尚未啟用`
  setTimeout(() => {
    notice.value = ''
  }, 2000)
}

watch(
  () => verificationStore.currentVerification?.vehicleId,
  (vehicleId) => {
    if (vehicleId) vehicleStore.fetchVehicle(vehicleId)
  },
)

onMounted(() => {
  verificationStore.fetchVerification(props.id)
})
</script>

<template>
  <div>
    <AppHeader title="分享驗證報告" back />

    <div class="content">
      <div class="share-card">
        <p class="vehicle-name">
          {{ vehicleStore.currentVehicle?.brand }} {{ vehicleStore.currentVehicle?.model }}
        </p>
        <p class="vehicle-meta">
          <span v-if="vehicleStore.currentVehicle?.year"
            >{{ vehicleStore.currentVehicle.year }} 年式</span
          >
          <span v-if="vehicleStore.currentVehicle?.mileage !== null">
            {{ vehicleStore.currentVehicle?.year ? ' · ' : '' }}
            {{ vehicleStore.currentVehicle?.mileage?.toLocaleString() }} km
          </span>
        </p>
        <p class="report-type">
          {{ typeLabel[verificationStore.currentVerification?.type ?? ''] ?? '驗證報告' }}
        </p>
        <p v-if="verificationStore.currentVerification" class="report-date">
          {{ formatDate(verificationStore.currentVerification.createdAt) }}
        </p>

        <div class="qr-placeholder">
          <QrCode :size="120" color="var(--color-text-primary)" />
        </div>
      </div>

      <div class="link-row">
        <p class="link-label">分享連結</p>
        <p class="link-value">{{ shareLink }}</p>
        <PrimaryButton variant="secondary" block @click="handleCopyLink">
          {{ copyState === 'copied' ? '已複製連結' : '複製連結' }}
        </PrimaryButton>
      </div>

      <p class="section-title">分享至</p>
      <div class="social-row">
        <button class="social-button" @click="handleUnavailable('LINE')">LINE</button>
        <button class="social-button" @click="handleUnavailable('Facebook')">Facebook</button>
        <button class="social-button" @click="handleUnavailable('Messenger')">Messenger</button>
        <button class="social-button" @click="handleShareMore">更多</button>
      </div>

      <p v-if="notice" class="notice">{{ notice }}</p>
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

.share-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}

.vehicle-name {
  font-size: 18px;
  font-weight: 700;
}

.vehicle-meta {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.report-type {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: var(--space-sm);
}

.report-date {
  font-size: 12px;
  color: var(--color-text-disabled);
}

.qr-placeholder {
  margin-top: var(--space-lg);
  padding: var(--space-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.link-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.link-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.link-value {
  font-size: 13px;
  color: var(--color-text-primary);
  word-break: break-all;
  margin-bottom: var(--space-sm);
}

.section-title {
  font-size: 15px;
  font-weight: 700;
}

.social-row {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.social-button {
  flex: 1;
  min-width: 80px;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 13px;
  font-weight: 600;
}

.notice {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
