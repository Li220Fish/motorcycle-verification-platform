<script setup lang="ts">
import { ref } from 'vue'
import { Bike, Lock, Mail } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

import Logo from '@/components/common/Logo.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
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
</script>

<template>
  <div class="login-page">
    <div class="login-hero">
      <Logo size="lg" />
      <p class="tagline">機車驗證平台</p>
      <div class="illustration">
        <Bike :size="56" color="var(--color-primary)" />
      </div>
    </div>

    <div class="login-card">
      <div class="mode-toggle">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登入</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">註冊</button>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label v-if="mode === 'register'" class="field">
          <span>顯示名稱</span>
          <input v-model="displayName" type="text" placeholder="騎士大哥" />
        </label>
        <label class="field">
          <span>電子郵件</span>
          <div class="input-with-icon">
            <Mail :size="18" />
            <input v-model="email" type="email" required placeholder="you@example.com" />
          </div>
        </label>
        <label class="field">
          <span>密碼</span>
          <div class="input-with-icon">
            <Lock :size="18" />
            <input
              v-model="password"
              type="password"
              required
              minlength="6"
              placeholder="••••••••"
            />
          </div>
        </label>

        <PrimaryButton type="submit" block :disabled="submitting">
          {{ submitting ? '請稍候...' : mode === 'register' ? '註冊' : '登入' }}
        </PrimaryButton>
      </form>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <div class="divider"><span>或使用其他方式</span></div>

      <div class="social-buttons">
        <PrimaryButton variant="secondary" block @click="handleUnavailableLogin('Google')">
          Google 登入
        </PrimaryButton>
        <PrimaryButton variant="secondary" block @click="handleUnavailableLogin('Apple')">
          Apple 登入
        </PrimaryButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xl) var(--space-md);
}

.login-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}

.tagline {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.illustration {
  width: 88px;
  height: 88px;
  border-radius: 999px;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--space-md);
}

.login-card {
  width: 100%;
  max-width: 360px;
}

.mode-toggle {
  display: flex;
  gap: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-lg);
}

.mode-toggle button {
  border: none;
  background: none;
  padding: var(--space-sm) 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-disabled);
  border-bottom: 2px solid transparent;
}

.mode-toggle button.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.field input {
  height: 46px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--color-text-primary);
}

.input-with-icon {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-md);
  color: var(--color-text-disabled);
}

.input-with-icon input {
  border: none;
  height: 46px;
  padding: 0;
  flex: 1;
  color: var(--color-text-primary);
}

.input-with-icon input:focus {
  outline: none;
}

.error {
  color: var(--color-danger);
  margin-top: var(--space-md);
  font-size: 14px;
}

.divider {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-text-disabled);
  font-size: 12px;
  margin: var(--space-lg) 0 var(--space-md);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.social-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
