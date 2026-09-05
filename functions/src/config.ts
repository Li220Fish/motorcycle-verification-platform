/** Centralized model/config — never hardcode the model id in more than one place. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'

/** Firebase Functions v2 secret name — bound per-function via `secrets: [GEMINI_API_KEY_SECRET]`.
 *  The actual key value lives only in Secret Manager, never in source or Firestore. */
export const GEMINI_API_KEY_SECRET = 'GEMINI_API_KEY'
