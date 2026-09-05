import { getFirestore } from 'firebase-admin/firestore'
import { onCall } from 'firebase-functions/v2/https'
import { assertCanAnalyze } from '../services/auth.service'

/**
 * Step 1 (歷史工單) — the Routing Map explicitly forbids inventing a
 * maintenance-document judgment scheme this pass ("目前尚未 Freeze
 * Maintenance Document Prompt/Schema... 不可自行發明完整維修判定規則",
 * §4/§71). No Gemini call here; this only proves the routing/permission
 * path is real and leaves an honest PENDING marker for whenever that spec
 * lands, instead of silently doing nothing or faking a result.
 */
export const analyzeDocumentMaintenance = onCall(async (request) => {
  const { verificationId, evidenceId } = (request.data ?? {}) as {
    verificationId?: string
    evidenceId?: string
  }
  if (!verificationId || !evidenceId) {
    throw new Error('verificationId and evidenceId are required')
  }
  await assertCanAnalyze(verificationId, request.auth?.uid)

  await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('evidence')
    .doc(evidenceId)
    .set(
      {
        metadata: {
          documentAnalysis: {
            status: 'PENDING_DOCUMENT_ANALYSIS_PROMPT',
            note: '維修文件判讀規格尚未 Freeze，本次僅記錄請求，未執行任何 AI 判定。',
          },
        },
      },
      { merge: true },
    )

  return { status: 'PENDING_DOCUMENT_ANALYSIS_PROMPT' }
})
