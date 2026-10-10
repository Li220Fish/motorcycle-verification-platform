<script setup lang="ts">
import { ref } from 'vue'
import { signInWithEmailAndPassword } from 'firebase/auth'

import { auth } from '@/services/firebase/firebase'

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit(): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
  } catch {
    error.value = '登入失敗，請確認帳號密碼'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page login">
    <h1>RiDE 訓練資料採集</h1>
    <p class="muted">開發者工具 · 使用 RiDE 帳號登入</p>
    <form class="card" @submit.prevent="submit">
      <input
        v-model="email"
        class="input"
        type="email"
        autocomplete="username"
        placeholder="Email"
        required
      />
      <input
        v-model="password"
        class="input"
        type="password"
        autocomplete="current-password"
        placeholder="密碼"
        required
      />
      <p v-if="error" class="bad small">{{ error }}</p>
      <button class="btn primary block" :disabled="busy">{{ busy ? '登入中…' : '登入' }}</button>
    </form>
  </div>
</template>

<style scoped>
.login {
  padding-top: calc(env(safe-area-inset-top) + 18vh);
}

.login h1 {
  margin: 0 0 4px;
  font-size: 24px;
}
</style>
