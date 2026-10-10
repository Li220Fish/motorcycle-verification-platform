<script setup lang="ts">
/**
 * 車輛轉移 — redeem side of a 車輛轉移邀請碼 (see functions/src/functions/
 * vehicle-transfer-invite.ts's own doc comment for why this is a SEPARATE
 * mechanism from transferVehicleOwnership's marketplace-sale path). Two
 * steps: enter the code the current owner gave you (peek, just to confirm
 * "是這台車"), then confirm — the code itself (short-lived, single-use,
 * handed over by the current owner directly) is the only gate; no further
 * document upload/verification is required.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useI18n } from '@/composables/useI18n'
import {
  peekVehicleTransferInvite,
  redeemVehicleTransferInvite,
  type PeekVehicleTransferInviteResult,
} from '@/services/firebase/vehicle-transfer.service'

const router = useRouter()
const { t } = useI18n()

const code = ref('')
const checking = ref(false)
const checkError = ref('')
const invite = ref<PeekVehicleTransferInviteResult | null>(null)

async function handleCheckCode(): Promise<void> {
  checkError.value = ''
  if (!code.value.trim()) {
    checkError.value = t('vehicleTransfer', 'errEmpty')
    return
  }
  checking.value = true
  try {
    invite.value = await peekVehicleTransferInvite(code.value.trim())
  } catch (error) {
    checkError.value = error instanceof Error ? error.message : t('vehicleTransfer', 'errQuery')
  } finally {
    checking.value = false
  }
}

function resetCode(): void {
  invite.value = null
  code.value = ''
  checkError.value = ''
}

const submitting = ref(false)
const submitError = ref('')

async function handleConfirmTransfer(): Promise<void> {
  if (!invite.value) return
  submitError.value = ''
  submitting.value = true
  try {
    const result = await redeemVehicleTransferInvite(code.value.trim())
    router.replace(`/vehicles/${result.vehicleId}`)
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : t('vehicleTransfer', 'errTransfer')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader :title="t('vehicleTransfer', 'title')" back />

    <div class="content">
      <template v-if="!invite">
        <p class="hint">{{ t('vehicleTransfer', 'intro') }}</p>
        <input
          v-model="code"
          class="code-input"
          :placeholder="t('vehicleTransfer', 'codePlaceholder')"
          autocapitalize="characters"
          @keyup.enter="handleCheckCode"
        />
        <p v-if="checkError" class="error">{{ checkError }}</p>
        <PrimaryButton block :disabled="checking" @click="handleCheckCode">
          {{ checking ? t('vehicleTransfer', 'checking') : t('vehicleTransfer', 'checkButton') }}
        </PrimaryButton>
      </template>

      <template v-else>
        <div class="vehicle-preview">
          <img v-if="invite.photo" :src="invite.photo" alt="" class="preview-photo" />
          <div class="preview-text">
            <h2>{{ invite.brand }} {{ invite.model }}</h2>
            <p v-if="invite.manufactureYear">
              {{ t('common', 'modelYear', { year: invite.manufactureYear }) }}
            </p>
          </div>
        </div>

        <p class="hint">{{ t('vehicleTransfer', 'confirmHint') }}</p>

        <p v-if="submitError" class="error">{{ submitError }}</p>
        <PrimaryButton block :disabled="submitting" @click="handleConfirmTransfer">
          {{
            submitting
              ? t('vehicleTransfer', 'transferring')
              : t('vehicleTransfer', 'confirmButton')
          }}
        </PrimaryButton>
        <button class="secondary" :disabled="submitting" @click="resetCode">
          {{ t('vehicleTransfer', 'reenter') }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.hint {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.code-input {
  width: 100%;
  height: 48px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 3px;
  text-align: center;
  text-transform: uppercase;
}

.error {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-danger);
}

.vehicle-preview {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-md);
}

.vehicle-preview img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.preview-text h2 {
  font-size: 16px;
  font-weight: 700;
}

.preview-text p {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.secondary {
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
}
</style>
