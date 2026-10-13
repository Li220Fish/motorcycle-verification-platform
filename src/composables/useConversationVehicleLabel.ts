import { ref, watch, type Ref } from 'vue'

import { homeContentService } from '@/services/firebase/home-content.service'
import { vehicleService } from '@/services/firebase/vehicle.service'
import type { ConversationContext } from '@/services/chat/chat.types'

/** Listings rarely change brand/model after publish — a plain module-level
 *  cache (not a live subscription, unlike useLiveAvatar's publicAvatars
 *  store) is enough, same "one-shot fetch, cache the result" shape as
 *  useVerificationCorePhotos. */
const listingLabelCache = new Map<string, string>()

/**
 * Resolves a conversation's context down to a "品牌 型號" label for
 * ConversationRow.vue's tag pill (ChatRoomView.vue already does this same
 * resolution inline for its own vehicle-context banner — see
 * contextVehicle/contextListing there — this is the same priority order,
 * just reusable for a list of many rows).
 *
 * `context.vehicleId` is checked first but in practice is never actually
 * set — every real conversation today is created from
 * MarketplaceListingView.vue's "聊聊"/預約 buttons, which only ever pass
 * `{ listingId }` (see chat.store.ts's findOrCreateConversation). Kept for
 * parity with ChatRoomView.vue's existing dual-path logic and because a
 * buyer can't read the seller's private vehicles/{id} directly anyway
 * (firestore.rules) — a permission-denied there just falls through to the
 * listingId path via the .catch below, never surfaces as an error.
 *
 * Returns null while loading or unresolvable — callers fall back to the
 * conversation's own `tag` text at that point.
 */
export function useConversationVehicleLabel(
  context: Ref<ConversationContext | undefined>,
): Ref<string | null> {
  const label = ref<string | null>(null)

  watch(
    context,
    async (ctx) => {
      label.value = null
      if (!ctx) return

      if (ctx.vehicleId) {
        const vehicle = await vehicleService.get(ctx.vehicleId).catch(() => null)
        if (context.value !== ctx) return
        if (vehicle) {
          label.value = `${vehicle.brand} ${vehicle.model}`
          return
        }
      }

      if (ctx.listingId) {
        const cached = listingLabelCache.get(ctx.listingId)
        if (cached) {
          label.value = cached
          return
        }
        const listing = await homeContentService
          .getMarketplaceListing(ctx.listingId)
          .catch(() => null)
        if (context.value !== ctx) return
        if (listing) {
          const text = `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model}`
          listingLabelCache.set(ctx.listingId, text)
          label.value = text
        }
      }
    },
    { immediate: true },
  )

  return label
}
