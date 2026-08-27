import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User as FirebaseUser } from 'firebase/auth'

import * as authService from '@/services/firebase/auth.service'
import type { User } from '@/types/user'

function toAppUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: firebaseUser.displayName,
    createdAt: Date.parse(firebaseUser.metadata.creationTime ?? '') || Date.now(),
    updatedAt: Date.now(),
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  let initialized = false
  let resolveReady: () => void
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })

  const isAuthenticated = computed(() => user.value !== null)

  function initialize(): void {
    if (initialized) return
    initialized = true
    authService.onAuthChange((firebaseUser) => {
      user.value = firebaseUser ? toAppUser(firebaseUser) : null
      loading.value = false
      resolveReady()
    })
  }

  /** Resolves once the initial Firebase auth state has been determined. */
  function waitUntilReady(): Promise<void> {
    return ready
  }

  async function register(email: string, password: string, displayName?: string): Promise<void> {
    loading.value = true
    try {
      const firebaseUser = await authService.register(email, password, displayName)
      user.value = toAppUser(firebaseUser)
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    try {
      const firebaseUser = await authService.login(email, password)
      user.value = toAppUser(firebaseUser)
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    await authService.logout()
    user.value = null
  }

  return { user, loading, isAuthenticated, initialize, waitUntilReady, register, login, logout }
})
