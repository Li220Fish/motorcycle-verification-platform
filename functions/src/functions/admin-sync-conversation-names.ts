import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { isAdminUid } from '../services/auth.service'

interface ConversationDoc {
  memberIds: string[]
  memberSnapshots: Record<string, { displayName: string }>
}

const BATCH_SIZE = 400

/**
 * One-time (re-runnable, idempotent) maintenance tool for the 討論中心/聊天室
 * display-name mismatch — conversations/{id}.memberSnapshots is a
 * denormalized snapshot frozen at conversation-creation time (see
 * conversation.service.ts's findOrCreateConversation), and had been drifting
 * from a user's actual current users/{uid}.displayName for two reasons: (1)
 * a rename never propagated afterward, and (2) the OTHER party's snapshot
 * was often never accurate to begin with — copied from
 * marketplaceListings.sellerName, itself frozen at listing-publish time, not
 * at conversation-creation time. on-user-profile-updated.ts now keeps this
 * in sync going forward on every rename; this callable exists purely to
 * correct whatever's already wrong in Firestore as of today. Admin-only,
 * safe to run more than once — it only writes a conversation whose stored
 * name actually differs from the member's current one.
 */
export const adminSyncConversationMemberNames = onCall({}, async (request) => {
  if (!isAdminUid(request.auth?.uid)) {
    throw new HttpsError('permission-denied', 'Admin only.')
  }

  const db = getFirestore()
  const [usersSnap, conversationsSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('conversations').get(),
  ])

  const currentNameByUid = new Map<string, string>()
  for (const docSnap of usersSnap.docs) {
    const displayName = docSnap.data().displayName as string | null | undefined
    if (displayName) currentNameByUid.set(docSnap.id, displayName)
  }

  let batch = db.batch()
  let opsInBatch = 0
  const pending: Promise<unknown>[] = []
  let conversationsUpdated = 0

  for (const docSnap of conversationsSnap.docs) {
    const data = docSnap.data() as ConversationDoc
    const updates: Record<string, string> = {}
    for (const memberId of data.memberIds ?? []) {
      const currentName = currentNameByUid.get(memberId)
      const storedName = data.memberSnapshots?.[memberId]?.displayName
      if (currentName && currentName !== storedName) {
        updates[`memberSnapshots.${memberId}.displayName`] = currentName
      }
    }
    if (Object.keys(updates).length === 0) continue

    batch.update(docSnap.ref, updates)
    opsInBatch++
    conversationsUpdated++
    if (opsInBatch === BATCH_SIZE) {
      pending.push(batch.commit())
      batch = db.batch()
      opsInBatch = 0
    }
  }
  if (opsInBatch > 0) pending.push(batch.commit())
  await Promise.all(pending)

  return { conversationsScanned: conversationsSnap.size, conversationsUpdated }
})
