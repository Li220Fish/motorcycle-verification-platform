<script setup lang="ts">
import { ref } from 'vue'
import { ShieldCheck } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

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
  errorMessage.value = `${providerName} 登入尚未啟用`
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
      <div class="mark"><ShieldCheck :size="26" /></div>
      <div class="name">Moto<b>Verify</b></div>
      <div class="sub">機車驗證平台</div>
    </div>

    <div class="auth-tabs">
      <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登入</button>
      <button :class="{ active: mode === 'register' }" @click="mode = 'register'">註冊</button>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <label v-if="mode === 'register'" class="form-field">
        <span>顯示名稱</span>
        <input v-model="displayName" type="text" placeholder="騎士大哥" />
      </label>
      <label class="form-field">
        <span>電子郵件</span>
        <input v-model="email" type="email" required placeholder="you@example.com" />
      </label>
      <label class="form-field">
        <span>密碼</span>
        <input v-model="password" type="password" required minlength="6" placeholder="••••••••" />
      </label>

      <button class="cta-blue" type="submit" :disabled="submitting">
        {{ submitting ? '請稍候...' : mode === 'register' ? '註冊' : '登入' }}
      </button>
    </form>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="auth-divider">或使用其他方式</div>

    <button class="social-btn" @click="handleUnavailableLogin('Google')">Google 登入</button>
    <button class="social-btn" @click="handleUnavailableLogin('Apple')">Apple 登入</button>

    <div v-if="isDev" class="quick-login">
      <div class="auth-divider">測試帳號快速登入（僅限開發環境）</div>
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
  background: var(--color-primary-dark);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
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
