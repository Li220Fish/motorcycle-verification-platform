import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'

const BATCH_SIZE = 400

interface UserProfileDoc {
  displayName?: string | null
}

/**
 * Keeps conversations/{id}.memberSnapshots.{uid}.displayName in sync with a
 * user's actual current name whenever they rename (AccountView.vue ->
 * authStore.updateDisplayName -> userProfileService.touchUserProfile writes
 * users/{uid}) — without this, every existing chat conversation would keep
 * showing whatever name was frozen in at conversation-creation time forever,
 * while 討論中心 always shows a fresh authorSnapshot for every new post/
 * comment (see conversation.service.ts's findOrCreateConversation — this app
 * intentionally freezes display identity at write time everywhere; this
 * trigger just re-freezes chat's copy whenever the source actually changes).
 * adminSyncConversationMemberNames (admin-sync-conversation-names.ts) is the
 * one-time counterpart that corrects whatever was already wrong before this
 * trigger existed.
 *
 * touchUserProfile writes users/{uid} on every auth-state resolution (every
 * login), not just on a real rename — comparing before/after displayName
 * (not just reacting to any write) keeps this a no-op on those routine
 * touches instead of re-scanning every member's conversations each time.
 */
export const onUserProfileUpdated = onDocumentWritten('users/{uid}', async (event) => {
  const before = event.data?.before.data() as UserProfileDoc | undefined
  const after = event.data?.after.data() as UserProfileDoc | undefined
  if (!after?.displayName || before?.displayName === after.displayName) return

  const { uid } = event.params
  const db = getFirestore()
  const snapshot = await db
    .collection('conversations')
    .where('memberIds', 'array-contains', uid)
    .get()
  if (snapshot.empty) return

  let batch = db.batch()
  let opsInBatch = 0
  const pending: Promise<unknown>[] = []
  for (const docSnap of snapshot.docs) {
    batch.update(docSnap.ref, { [`memberSnapshots.${uid}.displayName`]: after.displayName })
    opsInBatch++
    if (opsInBatch === BATCH_SIZE) {
      pending.push(batch.commit())
      batch = db.batch()
      opsInBatch = 0
    }
  }
  if (opsInBatch > 0) pending.push(batch.commit())
  await Promise.all(pending)
})
