<script setup lang="ts">
/**
 * Email 驗證 — email/password accounts land here (router guard) until their
 * address is confirmed. Uses Firebase Auth's own verification email (a link,
 * sent by Firebase — no mail server of ours). The page re-checks the account
 * every few seconds and whenever the app comes back to the foreground, so
 * tapping the link and returning is usually enough; "我已完成驗證" re-checks
 * immediately. Google accounts and the seeded test accounts never see this
 * page (auth.store's needsEmailVerification).
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { MailCheck } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useI18n } from '@/composables/useI18n'
import { sendVerificationEmail } from '@/services/firebase/auth.service'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t, isEnglish } = useI18n()

const sending = ref(false)
const checking = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

function startCooldown(seconds: number): void {
  cooldown.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1)
    if (cooldown.value === 0 && cooldownTimer) clearInterval(cooldownTimer)
  }, 1000)
}

function goNext(): void {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
  router.replace(redirect)
}

async function sendEmail(): Promise<void> {
  if (sending.value || cooldown.value > 0) return
  sending.value = true
  errorMessage.value = ''
  infoMessage.value = ''
  try {
    await sendVerificationEmail(isEnglish() ? 'en' : 'zh-TW')
    infoMessage.value = t('verifyEmail', 'sent', { email: authStore.user?.email ?? '' })
    startCooldown(60)
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/too-many-requests') {
      infoMessage.value = t('verifyEmail', 'alreadySent')
      startCooldown(60)
    } else {
      console.error('[VerifyEmailView] send failed:', error)
      errorMessage.value = t('verifyEmail', 'sendFailed')
    }
  } finally {
    sending.value = false
  }
}

/** `silent` = background poll: never shows "not verified yet". */
async function checkVerified(silent = false): Promise<void> {
  if (checking.value) return
  checking.value = true
  if (!silent) errorMessage.value = ''
  try {
    await authStore.refreshEmailVerified()
    if (!authStore.needsEmailVerification) {
      goNext()
    } else if (!silent) {
      errorMessage.value = t('verifyEmail', 'notYet')
    }
  } catch (error) {
    if (!silent) {
      console.error('[VerifyEmailView] check failed:', error)
      errorMessage.value = t('verifyEmail', 'checkFailed')
    }
  } finally {
    checking.value = false
  }
}

function onVisible(): void {
  if (document.visibilityState === 'visible') void checkVerified(true)
}

async function handleLogout(): Promise<void> {
  await authStore.logout()
  router.replace({ name: 'login' })
}

onMounted(() => {
  void sendEmail()
  pollTimer = setInterval(() => void checkVerified(true), 5000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <div class="verify-wrap">
    <div class="icon-chip"><MailCheck :size="28" /></div>
    <h1>{{ t('verifyEmail', 'title') }}</h1>
    <p class="hint">{{ t('verifyEmail', 'intro', { email: authStore.user?.email ?? '' }) }}</p>

    <ol class="steps">
      <li>{{ t('verifyEmail', 'step1') }}</li>
      <li>{{ t('verifyEmail', 'step2') }}</li>
      <li>{{ t('verifyEmail', 'step3') }}</li>
    </ol>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-else-if="infoMessage" class="info">{{ infoMessage }}</p>

    <PrimaryButton block :disabled="checking" @click="checkVerified()">
      {{ checking ? t('verifyEmail', 'checking') : t('verifyEmail', 'done') }}
    </PrimaryButton>

    <button class="link-btn" :disabled="sending || cooldown > 0" @click="sendEmail">
      {{
        sending
          ? t('verifyEmail', 'sending')
          : cooldown > 0
            ? t('verifyEmail', 'resendIn', { seconds: cooldown })
            : t('verifyEmail', 'resend')
      }}
    </button>
    <p class="spam-hint">{{ t('verifyEmail', 'spamHint') }}</p>
    <button class="link-btn muted" @click="handleLogout">{{ t('verifyEmail', 'logout') }}</button>
  </div>
</template>

<style scoped>
.verify-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-md);
  padding: calc(48px + var(--safe-area-inset-top, env(safe-area-inset-top))) 26px 32px;
  background: var(--color-surface);
}

.icon-chip {
  align-self: center;
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: var(--color-primary-bg, #e8f1fd);
  color: var(--color-primary);
}

h1 {
  margin: 0;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.hint {
  margin: 0;
  text-align: center;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  word-break: break-all;
}

.steps {
  margin: 0;
  padding: 12px 16px 12px 34px;
  border-radius: 14px;
  background: var(--color-background);
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-primary);
}

.error,
.info {
  margin: 0;
  text-align: center;
  font-size: 13px;
}

.error {
  color: var(--color-danger);
}

.info {
  color: var(--color-success);
}

.link-btn {
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 13.5px;
  font-weight: 700;
  padding: 6px;
}

.link-btn:disabled {
  color: var(--color-text-disabled);
}

.link-btn.muted {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.spam-hint {
  margin: -8px 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-disabled);
}
</style>
