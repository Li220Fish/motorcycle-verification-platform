import { defineStore } from 'pinia'
import { reactive } from 'vue'
import type { Unsubscribe } from 'firebase/firestore'

import { userProfileService } from '@/services/firebase/user-profile.service'

interface Entry {
  unsub: Unsubscribe
  refCount: number
}

/**
 * Ref-counted live subscriptions to publicAvatars/{uid} — many components
 * (a whole discussion feed by the same author, a chat list with several
 * conversations) can ask for the same uid at once, so this shares ONE
 * onSnapshot listener per uid across all of them instead of one per
 * component instance, and tears it down once nothing is asking anymore. See
 * the useLiveAvatar composable, which is the normal way to consume this.
 */
export const useAvatarStore = defineStore('avatar', () => {
  const photoUrlByUid = reactive<Record<string, string | null | undefined>>({})
  const entries = new Map<string, Entry>()

  function subscribe(uid: string): void {
    const existing = entries.get(uid)
    if (existing) {
      existing.refCount += 1
      return
    }
    const unsub = userProfileService.subscribePublicAvatar(uid, (photoUrl) => {
      photoUrlByUid[uid] = photoUrl
    })
    entries.set(uid, { unsub, refCount: 1 })
  }

  function unsubscribe(uid: string): void {
    const entry = entries.get(uid)
    if (!entry) return
    entry.refCount -= 1
    if (entry.refCount <= 0) {
      entry.unsub()
      entries.delete(uid)
      delete photoUrlByUid[uid]
    }
  }

  return { photoUrlByUid, subscribe, unsubscribe }
})
