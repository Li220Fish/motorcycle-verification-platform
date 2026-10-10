import { ref, watch, type Ref } from 'vue'

import { storageService } from '@/services/firebase/storage.service'
import { verificationService } from '@/services/firebase/verification.service'
import type { VerificationEvidence } from '@/types/verification-evidence'

/** The 6 core appearance photos every verification captures — fixed order
 *  matches photo-slots.ts's REQUIRED_PHOTO_SLOTS minus 'dashboard' (an
 *  odometer close-up, not an appearance photo). Shared by
 *  MarketplaceListingView.vue's buyer-facing 其他照片 and
 *  MyListingManageView.vue's seller-facing 驗證車輛照片 — same source data,
 *  different audience. */
export const CORE_VEHICLE_PHOTO_APR_ITEM_IDS = [
  'APR-left-side',
  'APR-right-side',
  'APR-rear',
  'APR-front-suspension',
  'APR-engine-bottom',
  'APR-transmission-chain',
] as const

/** Live-resolved download URLs for a verification's 6 core photos, in fixed
 *  order (missing/unresolvable slots are simply skipped, not padded with
 *  nulls) — re-fetched whenever `verificationId` changes. Read-only by
 *  design: verification evidence is immutable once its verification is
 *  public (firestore.rules), so nothing here ever writes back to it — any
 *  editing (e.g. rotate) a caller wants to offer the user must stay a
 *  view-time-only transform. */
export function useVerificationCorePhotos(verificationId: Ref<string | undefined>): Ref<string[]> {
  const photos = ref<string[]>([])

  watch(
    verificationId,
    async (id) => {
      photos.value = []
      if (!id) return
      const evidence = await verificationService
        .listEvidence(id)
        .catch(() => [] as VerificationEvidence[])
      const latestByItem = new Map<string, VerificationEvidence>()
      for (const item of evidence) {
        if (item.type !== 'photo' || !item.remoteUrl) continue
        if (
          !CORE_VEHICLE_PHOTO_APR_ITEM_IDS.includes(
            item.itemId as (typeof CORE_VEHICLE_PHOTO_APR_ITEM_IDS)[number],
          )
        )
          continue
        const existing = latestByItem.get(item.itemId)
        if (!existing || item.createdAt > existing.createdAt) latestByItem.set(item.itemId, item)
      }

      const resolved: Record<string, string> = {}
      await Promise.all(
        Array.from(latestByItem.entries()).map(async ([itemId, item]) => {
          try {
            resolved[itemId] = await storageService.resolveDownloadUrl(item.remoteUrl!)
          } catch {
            // Skipped — same as any other missing/unresolvable slot.
          }
        }),
      )
      // Bail if verificationId moved on again while the above was in flight.
      if (verificationId.value !== id) return
      photos.value = CORE_VEHICLE_PHOTO_APR_ITEM_IDS.map((itemId) => resolved[itemId]).filter(
        (url): url is string => !!url,
      )
    },
    { immediate: true },
  )

  return photos
}
