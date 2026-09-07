import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { isAdminUid } from '../services/auth.service'
import { listAiPromptCatalog } from '../services/prompt-config.service'

/** Read-only. Overrides themselves are written directly to Firestore by the
 *  admin webapp (aiPrompts/{key}, gated by firestore.rules' isAdmin()) —
 *  this callable only exists because the DEFAULT text for each prompt lives
 *  in Cloud Functions source, not in Firestore, so the admin editor has no
 *  other way to see what it would fall back to. */
export const getAiPromptCatalog = onCall({}, async (request) => {
  if (!isAdminUid(request.auth?.uid)) {
    throw new HttpsError('permission-denied', 'Admin only.')
  }
  return { prompts: await listAiPromptCatalog() }
})
