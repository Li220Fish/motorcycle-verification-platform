<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { adminLogin } from './services/admin-auth.service'
import './admin.css'

const router = useRouter()

const username = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

async function handleSubmit(): Promise<void> {
  errorMessage.value = ''
  submitting.value = true
  try {
    await adminLogin(username.value.trim(), password.value)
    router.push({ name: 'admin-dashboard' })
  } catch {
    errorMessage.value = '帳號或密碼錯誤'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="admin-root admin-login-root">
    <form class="admin-login-card" @submit.prevent="handleSubmit">
      <div class="admin-login-brand">
        <div class="admin-brand-mark">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            width="15"
            height="15"
          >
            <path d="M12 2 4 5.5v6c0 5 3.4 9.2 8 10.5 4.6-1.3 8-5.5 8-10.5v-6z"></path>
          </svg>
        </div>
        <div>
          <div class="admin-login-name">MotoVerify</div>
          <div class="admin-login-sub">營運後台</div>
        </div>
      </div>

      <label class="admin-field">
        <span>帳號</span>
        <input v-model="username" type="text" autocomplete="username" placeholder="test" />
      </label>
      <label class="admin-field">
        <span>密碼</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="test"
        />
      </label>

      <button class="admin-btn primary admin-login-submit" type="submit" :disabled="submitting">
        {{ submitting ? '登入中...' : '登入' }}
      </button>
      <p v-if="errorMessage" class="admin-login-error">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<style scoped>
.admin-login-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.admin-login-card {
  width: 100%;
  max-width: 320px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 12px 30px -12px rgba(19, 26, 36, 0.18);
}

.admin-login-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.admin-login-name {
  font-weight: 800;
  font-size: 16px;
  color: var(--text);
}

.admin-login-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: -2px;
}

.admin-login-submit {
  height: 42px;
  margin-top: 4px;
}

.admin-login-error {
  margin: 0;
  font-size: 12.5px;
  color: var(--risk);
  text-align: center;
}
</style>
