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
          <svg viewBox="0 0 618 618">
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
        <div>
          <div class="admin-login-name">RiDE78</div>
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
