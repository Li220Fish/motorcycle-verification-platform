import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_MODEL } from '../config'
import { callGeminiJson, ImagePart } from '../ai/gemini/client'
import { resolveImageEvidenceForViews } from '../services/evidence.service'
import { withAnalysisStatus } from '../services/analysis-status.service'
import { DASHBOARD_OCR_V2_PROMPT_VERSION } from '../ai/prompts/dashboard-ocr-v2'
import { hashPromptText, resolvePromptText } from '../services/prompt-config.service'

/** OCR output is written onto the source Evidence doc's own `metadata.ocr`
 *  — it isn't an Inspection Item / Answer, since the dashboard mileage
 *  reading isn't part of the Required/Optional Answer registry.
 *
 *  2026-09：前台賣家/買家報告（VerificationReportView.vue 的
 *  `latestOcrResult` + InspectionReportBody.vue 的「OCR 判讀里程」那一行）
 *  現在會讀取並顯示這個結果了。後台 VerifyDetailSection.vue 的
 *  evidence-tile 目前還沒接，如果之後要接也是讀同一個
 *  `evidence.metadata.ocr` 欄位。 */
async function persistOcrResult(
  verificationId: string,
  evidenceId: string,
  promptVersion: string,
  result: OcrResult,
): Promise<void> {
  await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('evidence')
    .doc(evidenceId)
    .set(
      { metadata: { ocr: { ...result, promptVersion, analyzedAt: Date.now() } } },
      { merge: true },
    )
}

/**
 * Dashboard OCR (Verification v2 migration spec §18 — dashboard-ocr-v2).
 * Plate OCR (step 9) and chassis-number OCR (step 23) are removed along
 * with those steps — `verifyVehicleRegistrationDocument`
 * (vehicle-registration.service.ts) is a separate, unrelated 行照 OCR flow
 * and is not affected by this migration.
 */
export interface OcrResult {
  text: string | null
  confidence: number | null
  note: string | null
}

const OCR_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: ['string', 'null'] },
    confidence: { type: ['number', 'null'] },
    note: { type: ['string', 'null'] },
  },
  required: ['text', 'confidence', 'note'],
}

async function runOcr(params: {
  apiKey: string
  promptText: string
  promptVersion: string
  image: ImagePart
}): Promise<OcrResult> {
  return callGeminiJson<OcrResult>({
    apiKey: params.apiKey,
    promptText: params.promptText,
    images: [params.image],
    responseSchema: OCR_SCHEMA,
    // Hash busts the response cache when an admin edits this prompt's text
    // (see prompt-config.service.ts) — promptVersion alone is a stable route
    // name that doesn't change just because the text did.
    cacheDiscriminators: [params.promptVersion, hashPromptText(params.promptText)],
    promptVersion: params.promptVersion,
  })
}

export async function analyzeDashboardOcr(params: {
  verificationId: string
  apiKey: string
}): Promise<OcrResult & { evidenceId: string }> {
  return withAnalysisStatus(params.verificationId, 'dashboardOcr', async () => {
    const [image] = await resolveImageEvidenceForViews(params.verificationId, ['dashboard'])
    const result = await runOcr({
      apiKey: params.apiKey,
      promptText: await resolvePromptText('dashboard-ocr-v2'),
      promptVersion: DASHBOARD_OCR_V2_PROMPT_VERSION,
      image,
    })
    await persistOcrResult(
      params.verificationId,
      image.evidenceId,
      DASHBOARD_OCR_V2_PROMPT_VERSION,
      result,
    )
    return { ...result, evidenceId: image.evidenceId }
  })
}

export const OCR_MODEL = GEMINI_MODEL
