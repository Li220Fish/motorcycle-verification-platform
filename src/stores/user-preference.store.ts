import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { userPreferenceService } from '@/services/firebase/user-preference.service'
import type { UserUsageRole } from '@/types/user-preference'

function storageKey(userId: string): string {
  return `motoverify:userPreference:${userId}`
}

function readLocal(userId: string): UserUsageRole | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw === 'buyer' || raw === 'seller' || raw === 'professional_seller' ? raw : null
  } catch {
    return null
  }
}

function writeLocal(userId: string, role: UserUsageRole): void {
  try {
    localStorage.setItem(storageKey(userId), role)
  } catch {
    // best-effort only — an unavailable localStorage must never block the app
  }
}

export const useUserPreferenceStore = defineStore('userPreference', () => {
  const currentRole = ref<UserUsageRole | null>(null)
  const hasSelectedRole = computed(() => currentRole.value !== null)
  let loadedForUserId: string | null = null

  /**
   * Local-first (§39/§40 of the Home redesign spec): localStorage is read
   * synchronously so Home never waits on a network round-trip, and Firestore
   * is only consulted to recover a role on a fresh device/browser — never
   * allowed to block reaching Home if it errors or is slow.
   */
  async function load(userId: string): Promise<void> {
    if (loadedForUserId === userId) return
    loadedForUserId = userId
    const local = readLocal(userId)
    if (local) currentRole.value = local

    try {
      const remote = await userPreferenceService.get(userId)
      if (remote && !local) {
        currentRole.value = remote
        writeLocal(userId, remote)
      }
    } catch {
      // Firebase being unreachable must never prevent Home from loading.
    }
  }

  async function setRole(userId: string, role: UserUsageRole): Promise<void> {
    currentRole.value = role
    writeLocal(userId, role)
    try {
      await userPreferenceService.set(userId, role)
    } catch {
      // best-effort sync only — local state (and thus the UI) already updated
    }
  }

  return { currentRole, hasSelectedRole, load, setRole }
})
