<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const displayName = ref('')
const errorMessage = ref('')
const submitting = ref(false)

async function handleSubmit(): Promise<void> {
  errorMessage.value = ''
  submitting.value = true
  try {
    if (mode.value === 'register') {
      await authStore.register(email.value, password.value, displayName.value)
    } else {
      await authStore.login(email.value, password.value)
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.push(redirect)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Authentication failed'
  } finally {
    submitting.value = false
  }
}

function handleUnavailableLogin(providerName: string): void {
  errorMessage.value = t('login', 'unavailableLogin', { provider: providerName })
}

// Dev/QA-only quick login — see scripts/seed-test-users.mjs and
// docs/test-accounts.md. Vite statically strips this whole block (and the
// template section that uses it) out of production builds.
const isDev = !import.meta.env.PROD
const quickLoginAccounts = [
  { label: '管理員', email: 'admin@test.com' },
  { label: '用戶1', email: 'user1@test.com' },
  { label: '用戶2', email: 'user2@test.com' },
  { label: '用戶3', email: 'user3@test.com' },
  { label: 'Agent測試帳號', email: 'agent@test.com' },
]
const TEST_PASSWORD = 'test1234'

async function quickLogin(accountEmail: string): Promise<void> {
  errorMessage.value = ''
  submitting.value = true
  try {
    await authStore.login(accountEmail, TEST_PASSWORD)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.push(redirect)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Authentication failed'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-logo">
      <div class="mark">
        <!-- Same inline mark as Logo.vue — see its own comment for why this
             is inlined rather than an <img> to /favicon.svg. -->
        <svg viewBox="0 0 618 618" class="mark-svg">
          <rect width="618" height="618" fill="#2C4BEA" />
          <g transform="translate(-28,-10)">
            <path
              d="M295.2,327.7 A70,70 0 1 0 308.6,430"
              fill="none"
              stroke="#FFFFFF"
              stroke-width="50"
            />
            <path
              d="M155,158 H380 C437,158 482,200 482,252 C482,300 445,338 395,345 L520,472 L448,474 L265,380 L340,282 H378 C398,282 410,268 410,252 C410,236 398,220 378,220 H208 Z"
              fill="#FFFFFF"
              stroke="#2C4BEA"
              stroke-width="14"
              stroke-linejoin="miter"
              paint-order="stroke"
            />
          </g>
        </svg>
      </div>
      <div class="name">RiDE<b>78</b></div>
      <div class="sub">{{ t('login', 'tagline') }}</div>
    </div>

    <div class="auth-tabs">
      <button :class="{ active: mode === 'login' }" @click="mode = 'login'">
        {{ t('login', 'login') }}
      </button>
      <button :class="{ active: mode === 'register' }" @click="mode = 'register'">
        {{ t('login', 'register') }}
      </button>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <label v-if="mode === 'register'" class="form-field">
        <span>{{ t('login', 'displayName') }}</span>
        <input
          v-model="displayName"
          type="text"
          :placeholder="t('login', 'displayNamePlaceholder')"
        />
      </label>
      <label class="form-field">
        <span>{{ t('login', 'email') }}</span>
        <input v-model="email" type="email" required placeholder="you@example.com" />
      </label>
      <label class="form-field">
        <span>{{ t('login', 'password') }}</span>
        <input v-model="password" type="password" required minlength="6" placeholder="••••••••" />
      </label>

      <button class="cta-blue" type="submit" :disabled="submitting">
        {{
          submitting
            ? t('login', 'pleaseWait')
            : mode === 'register'
              ? t('login', 'register')
              : t('login', 'login')
        }}
      </button>
    </form>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="auth-divider">{{ t('login', 'orOtherWays') }}</div>

    <button class="social-btn" @click="handleUnavailableLogin('Google')">
      {{ t('login', 'googleLogin') }}
    </button>
    <button class="social-btn" @click="handleUnavailableLogin('Apple')">
      {{ t('login', 'appleLogin') }}
    </button>

    <div v-if="isDev" class="quick-login">
      <div class="auth-divider">{{ t('login', 'quickLoginDivider') }}</div>
      <div class="quick-login-buttons">
        <button
          v-for="account in quickLoginAccounts"
          :key="account.email"
          type="button"
          class="quick-login-btn"
          :disabled="submitting"
          @click="quickLogin(account.email)"
        >
          {{ account.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 28px 26px;
  overflow-y: auto;
  background: var(--color-surface);
}

.auth-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
}

.auth-logo .mark {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-logo .mark-svg {
  width: 100%;
  height: 100%;
}

.auth-logo .name {
  font-size: 19px;
  font-weight: 900;
  color: var(--color-text-primary);
}

.auth-logo .name b {
  color: var(--color-primary);
  font-weight: 900;
}

.auth-logo .sub {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.auth-tabs {
  display: flex;
  gap: 22px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 18px;
}

.auth-tabs button {
  background: none;
  border: none;
  padding: 8px 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
}

.auth-tabs button.active {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.form-field input {
  border: 1px solid var(--color-border);
  border-radius: 11px;
  padding: 11px 13px;
  font-size: 13.5px;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.form-field input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.cta-blue {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 14px;
  font-size: 14.5px;
  font-weight: 800;
  width: 100%;
  margin-top: 4px;
}

.cta-blue:disabled {
  opacity: 0.6;
}

.error {
  color: var(--color-danger);
  margin-top: var(--space-md);
  font-size: 13px;
  text-align: center;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-disabled);
  font-size: 11.5px;
  margin: 16px 0;
  text-align: center;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 12px;
  padding: 11px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 9px;
}

.quick-login-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-login-btn {
  height: 40px;
  border: 1px dashed var(--color-border);
  border-radius: 11px;
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.quick-login-btn:disabled {
  opacity: 0.6;
}
</style>
