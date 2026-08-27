<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
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
</script>

<template>
  <section>
    <PageHeader
      title="Login"
      description="Email/password authentication backed by Firebase Auth."
    />

    <div class="mode-toggle">
      <button :class="{ active: mode === 'login' }" @click="mode = 'login'">Login</button>
      <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Register</button>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <label v-if="mode === 'register'">
        Display Name
        <input v-model="displayName" type="text" />
      </label>
      <label>
        Email
        <input v-model="email" type="email" required />
      </label>
      <label>
        Password
        <input v-model="password" type="password" required minlength="6" />
      </label>
      <button type="submit" :disabled="submitting">
        {{ submitting ? 'Please wait...' : mode === 'register' ? 'Register' : 'Login' }}
      </button>
    </form>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </section>
</template>

<style scoped>
.mode-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.mode-toggle .active {
  font-weight: 700;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 320px;
}

.auth-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.error {
  color: #b00020;
  margin-top: 1rem;
}
</style>
