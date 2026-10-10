<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'

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

/**
 * 2026-10: real public link — `/share/:id` (SharedReportView.vue) needs no
 * login (anonymous Firebase session, see that view's own doc comment) and
 * works for anyone the URL reaches. `isPublic` still gates it server-side
 * (firestore.rules): a verification not yet attached to a published
 * marketplaceListing simply won't load there, same "尚未公開分享" state
 * VerificationReportView.vue already handles for a non-owner.
 *
 * brand/model/year ride along as query params because SharedReportView.vue
 * (a stranger, even once signed in anonymously) has no read access to the
 * vehicles/{id} doc at all — that doc has no isPublic branch, unlike the
 * verification/answers/evidence it points at — same constraint
 * VerificationReportView.vue's own vehicleTitle fallback already documents
 * for a Marketplace listing link.
 */
const shareLink = computed(() => {
  const url = new URL(`/share/${props.id}`, window.location.origin)
  const vehicle = vehicleStore.currentVehicle
  if (vehicle) {
    url.searchParams.set('brand', vehicle.brand)
    url.searchParams.set('model', vehicle.model)
    if (vehicle.manufactureYear) url.searchParams.set('year', String(vehicle.manufactureYear))
  }
  return url.toString()
})

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

// Generated client-side (no network call, no third-party QR API ever sees
// the link) — `qrcode` is a pure-JS encoder, same "stay in-house" instinct
// as the rest of this app's AI-only-via-Gemini posture. Regenerated
// whenever shareLink changes (vehicle snapshot arriving after the initial
// render adds the brand/model/year query params — see shareLink's own
// comment) rather than computed synchronously, since toDataURL() is async.
const qrCodeDataUrl = ref('')
watch(
  shareLink,
  async (link) => {
    try {
      qrCodeDataUrl.value = await QRCode.toDataURL(link, { width: 240, margin: 1 })
    } catch {
      qrCodeDataUrl.value = ''
    }
  },
  { immediate: true },
)

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
          <span v-if="vehicleStore.currentVehicle?.manufactureYear"
            >{{ vehicleStore.currentVehicle.manufactureYear }} 年式</span
          >
          <span v-if="vehicleStore.currentVehicle?.mileage !== null">
            {{ vehicleStore.currentVehicle?.manufactureYear ? ' · ' : '' }}
            {{ vehicleStore.currentVehicle?.mileage?.toLocaleString() }} km
          </span>
        </p>
        <p class="report-type">
          {{ typeLabel[verificationStore.currentVerification?.type ?? ''] ?? '驗證報告' }}
        </p>
        <p v-if="verificationStore.currentVerification" class="report-date">
          {{ formatDate(verificationStore.currentVerification.createdAt) }}
        </p>

        <div class="qr-code">
          <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="分享連結 QR Code" />
        </div>
      </div>

      <div class="link-row">
        <p class="link-label">分享連結</p>
        <p class="link-value">{{ shareLink }}</p>
        <PrimaryButton variant="secondary" block @click="handleCopyLink">
          {{ copyState === 'copied' ? '已複製連結' : '複製連結' }}
        </PrimaryButton>
      </div>
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

.qr-code {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-code img {
  width: 100%;
  height: 100%;
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
</style>
