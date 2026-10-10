import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { isAdminUid } from '../services/auth.service'

/**
 * One-time (re-runnable, idempotent) data-repair tool for a real data-loss
 * bug found live 2026-09-23: verification.store.ts's loadFlow() used to
 * blindly re-push EVERY locally-cached evidence/answer item back to
 * Firestore on every resume, via saveEvidence()/saveAnswer() — both full
 * setDoc() overwrites — without checking whether that item already existed
 * remotely. A local evidence copy never learns its `remoteUrl` (only
 * upload-queue.store.ts's updateEvidenceRemoteUrl() writes that, straight to
 * Firestore, never back into any client cache), so resuming a verification
 * AFTER its photos had already finished uploading silently wiped their
 * `remoteUrl` back out, leaving only a dead `blob:` localUri behind — even
 * though the actual file was sitting in Storage the whole time. Fixed at the
 * source in verification.store.ts (loadFlow now skips anything that already
 * exists remotely); this callable exists purely to restore the one
 * already-published verification (y6DcIt7HefHg5UwSqNug) found in this state,
 * whose evidence/{id} writes are otherwise permanently locked by
 * firestore.rules once isPublic is true (by design — see that rule's own
 * comment) and so unfixable through any client-SDK path, admin included.
 *
 * Admin-only. Safe to run more than once — only patches an evidence doc
 * whose remoteUrl is still missing, and only with the exact Storage path the
 * file was independently confirmed to already exist at.
 */
const VERIFICATION_ID = 'y6DcIt7HefHg5UwSqNug'
const RESTORE: Record<string, string> = {
  '0f7beadd-62ed-4672-b034-df388fa029ef': `verifications/${VERIFICATION_ID}/evidence/1789277502629-APR-left-side.jpg`,
  '1bbb7eb1-dcd7-4731-a696-a3128ca108a4': `verifications/${VERIFICATION_ID}/evidence/1789277513147-APR-right-side.jpg`,
  '29ef3bb6-84b3-44ea-a050-0a20e3a9f1dd': `verifications/${VERIFICATION_ID}/evidence/1789277525174-APR-dashboard.jpg`,
  '68185a51-28af-4fe6-80c7-4ab4880b8978': `verifications/${VERIFICATION_ID}/evidence/1789277565371-APR-transmission-chain.jpg`,
  '83b38536-56be-4c67-a3f4-85245f8d3488': `verifications/${VERIFICATION_ID}/evidence/1789277531357-APR-rear.jpg`,
  'b6663c9b-8e63-47c6-9e8b-077f1c32dd05': `verifications/${VERIFICATION_ID}/evidence/1789277552771-APR-engine-bottom.jpg`,
  'cc34c339-7064-431b-9a46-c63186d5a672': `verifications/${VERIFICATION_ID}/evidence/1789277541618-APR-front-suspension.jpg`,
}

export const adminRestoreEvidenceRemoteUrl = onCall({}, async (request) => {
  if (!isAdminUid(request.auth?.uid)) {
    throw new HttpsError('permission-denied', 'Admin only.')
  }

  const db = getFirestore()
  const evidenceCollection = db.collection('verifications').doc(VERIFICATION_ID).collection('evidence')

  let patched = 0
  let alreadyOk = 0
  for (const [evidenceId, remoteUrl] of Object.entries(RESTORE)) {
    const ref = evidenceCollection.doc(evidenceId)
    const snap = await ref.get()
    if (!snap.exists) continue
    if (snap.data()?.remoteUrl) {
      alreadyOk++
      continue
    }
    await ref.update({ remoteUrl })
    patched++
  }

  return { patched, alreadyOk, total: Object.keys(RESTORE).length }
})
