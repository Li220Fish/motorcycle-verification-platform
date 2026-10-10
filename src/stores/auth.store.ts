import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Unsubscribe } from 'firebase/firestore'
import type { User as FirebaseUser } from 'firebase/auth'

import * as authService from '@/services/firebase/auth.service'
import { pushNotificationService } from '@/services/firebase/push-notification.service'
import { userProfileService } from '@/services/firebase/user-profile.service'
import type { User } from '@/types/user'

function toAppUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: firebaseUser.displayName,
    photoUrl: firebaseUser.photoURL,
    createdAt: Date.parse(firebaseUser.metadata.creationTime ?? '') || Date.now(),
    updatedAt: Date.now(),
    isAnonymous: firebaseUser.isAnonymous,
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
  let unsubOwnProfile: Unsubscribe | null = null

  // Anonymous (SharedReportView.vue's signInAnonymous) deliberately never
  // counts as authenticated here — every requiresAuth route guard
  // (router/index.ts) and every "you must be logged in" gate in the rest of
  // the app reads this, and a drive-by public-report visitor must stay
  // locked out of all of it, not just see a restricted report. The ONE
  // place that cares about "is there a session at all, even anonymous" is
  // SharedReportView.vue's own mount check against auth.currentUser
  // directly (see src/services/firebase/firebase.ts's `auth`), not this.
  const isAuthenticated = computed(() => user.value !== null && !user.value.isAnonymous)

  function initialize(): void {
    if (initialized) return
    initialized = true
    authService.onAuthChange((firebaseUser) => {
      unsubOwnProfile?.()
      unsubOwnProfile = null
      user.value = firebaseUser ? toAppUser(firebaseUser) : null
      loading.value = false
      resolveReady()
      // Anonymous sessions skip the profile mirror/push-token/live-subscribe
      // setup entirely — none of that should exist for a stranger who just
      // opened a share link (no users/{uid} doc, no publicAvatars/{uid}, no
      // FCM registration; see userProfileService.touchUserProfile's own
      // writes). `firebaseUser.isAnonymous` is checked directly rather than
      // via toAppUser()/user.value, which already went through the same
      // reduction this guard needs.
      if (firebaseUser && !firebaseUser.isAnonymous) {
        void userProfileService.touchUserProfile(
          firebaseUser.uid,
          firebaseUser.email ?? '',
          firebaseUser.displayName,
          firebaseUser.photoURL,
        )
        void pushNotificationService.initialize(firebaseUser.uid)
        // Keeps `user.value.displayName`/`photoUrl` live against the
        // Firestore mirror doc rather than Firebase Auth's own local cache
        // — see userProfileService.subscribeOwnProfile's doc comment for why
        // the cache alone lets a stale/deleted avatar survive a page reload.
        unsubOwnProfile = userProfileService.subscribeOwnProfile(firebaseUser.uid, (profile) => {
          if (!user.value || user.value.id !== firebaseUser.uid) return
          user.value = { ...user.value, ...profile }
        })
      }
    })
  }

  /** SharedReportView.vue's one caller — see authService.signInAnonymous's
   *  own doc comment. Returns normally even if a session (of either kind)
   *  already exists; the caller checks auth.currentUser first so this only
   *  actually fires for a genuinely fresh visitor. */
  async function signInAnonymous(): Promise<void> {
    await authService.signInAnonymous()
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

  async function updateDisplayName(displayName: string): Promise<void> {
    await authService.updateDisplayName(displayName)
    if (user.value) {
      user.value = { ...user.value, displayName, updatedAt: Date.now() }
      void userProfileService.touchUserProfile(user.value.id, user.value.email, displayName)
    }
  }

  async function updateAvatarUrl(photoUrl: string): Promise<void> {
    await authService.updatePhotoURL(photoUrl)
    if (user.value) {
      user.value = { ...user.value, photoUrl, updatedAt: Date.now() }
      void userProfileService.touchUserProfile(
        user.value.id,
        user.value.email,
        user.value.displayName,
        photoUrl,
      )
    }
  }

  /** Does NOT update `user.value.email` — the address only actually changes
   * once the user clicks the verification link Firebase sends them, at which
   * point the next auth state refresh (e.g. next login) picks it up. */
  async function updateEmail(newEmail: string, currentPassword: string): Promise<void> {
    await authService.updateEmail(newEmail, currentPassword)
  }

  async function sendPasswordReset(email: string): Promise<void> {
    await authService.sendPasswordReset(email)
  }

  return {
    user,
    loading,
    isAuthenticated,
    initialize,
    waitUntilReady,
    register,
    login,
    signInAnonymous,
    logout,
    updateDisplayName,
    updateAvatarUrl,
    updateEmail,
    sendPasswordReset,
  }
})
