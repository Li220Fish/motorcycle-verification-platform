import liff from '@line/liff'
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'

import { LIFF_ID } from '@el/settings'
import { auth } from './firebase'

export interface Identity {
  mode: 'line' | 'dev'
  displayName: string | null
  /** What proves who is submitting: a LINE ID token, or a Firebase token header. */
  credentials(): Promise<{ headers: Record<string, string>; lineIdToken?: string }>
  closeWindow(): void
}

function anonymousUser(): Promise<User> {
  return new Promise((resolve, reject) => {
    const off = onAuthStateChanged(auth, (current) => {
      if (current) {
        off()
        resolve(current)
      }
    })
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((error) => {
        off()
        reject(error)
      })
    }
  })
}

/** LIFF when configured, otherwise an anonymous Firebase account (dev). */
export async function resolveIdentity(): Promise<Identity> {
  if (LIFF_ID) {
    await liff.init({ liffId: LIFF_ID })
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href })
      await new Promise(() => {}) // navigating to LINE Login
    }
    const profile = await liff.getProfile().catch(() => null)
    return {
      mode: 'line',
      displayName: profile?.displayName ?? null,
      async credentials() {
        const token = liff.getIDToken()
        if (!token) throw new Error('LINE 登入已過期，請從 LINE 重新開啟')
        return { headers: {}, lineIdToken: token }
      },
      closeWindow: () => {
        if (liff.isInClient()) liff.closeWindow()
      },
    }
  }
  const user = await anonymousUser()
  return {
    mode: 'dev',
    displayName: null,
    async credentials() {
      return { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }
    },
    closeWindow: () => undefined,
  }
}
