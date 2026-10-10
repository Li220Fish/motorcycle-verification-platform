import { computed, onUnmounted, watch, type ComputedRef, type Ref } from 'vue'

import { useAvatarStore } from '@/stores/avatar.store'

/**
 * Live photoUrl for a given uid, backed by publicAvatars/{uid} (see
 * avatar.store.ts) — the fix for memberSnapshots/authorSnapshot's photoUrl
 * only ever reflecting whatever it was at the moment that conversation/post/
 * comment was created. Falls back to `fallback` (typically the frozen
 * snapshot's own photoUrl) until the live subscription has resolved at
 * least once, and forever for a uid with no publicAvatars doc at all (e.g.
 * an admin-deleted account — see firestore.rules' users/{userId} comment on
 * why content stays readable after that).
 */
export function useLiveAvatar(
  uid: Ref<string | null | undefined> | (() => string | null | undefined),
  fallback?: Ref<string | null | undefined> | (() => string | null | undefined),
): ComputedRef<string | null | undefined> {
  const store = useAvatarStore()
  const getUid = typeof uid === 'function' ? uid : () => uid.value
  const getFallback = typeof fallback === 'function' ? fallback : () => fallback?.value
  let subscribedUid: string | null = null

  watch(
    getUid,
    (nextUid) => {
      if (subscribedUid) store.unsubscribe(subscribedUid)
      subscribedUid = nextUid ?? null
      if (subscribedUid) store.subscribe(subscribedUid)
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (subscribedUid) store.unsubscribe(subscribedUid)
  })

  return computed(() => {
    const live = subscribedUid ? store.photoUrlByUid[subscribedUid] : undefined
    return live !== undefined ? live : getFallback()
  })
}
