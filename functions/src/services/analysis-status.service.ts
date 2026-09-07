import { getFirestore } from 'firebase-admin/firestore'

/**
 * Verification v2 — every background AI route used to be pure fire-and-
 * forget from the client with a swallowed `.catch(() => {})`; a Gemini 429/
 * 5xx/timeout/schema failure left NO trace anywhere (no failed Answer for
 * Group A/B/C-style items with no manual fallback, no retry affordance).
 * Rule §35: "API error != unsure" — these helpers give every AI route a
 * place to record that distinction so the client can tell "still analyzing"
 * from "genuinely failed, offer retry" via Verification.analysisStatus
 * (types/verification.ts's AnalysisStatusEntry), instead of silence forever.
 *
 * Call `markProcessing` before the Gemini/OCR call, then EITHER
 * `markCompleted` on success OR `markFailed` in a catch block that
 * re-throws — this never swallows the original error, it just also leaves a
 * Firestore trace the client's realtime subscription can react to.
 */
export type AnalysisRouteKey = 'coreVision' | 'dashboardOcr' | 'coldCheck' | 'engineSensorSession'

async function writeStatus(
  verificationId: string,
  key: AnalysisRouteKey,
  status: 'processing' | 'completed' | 'failed',
  error?: string,
): Promise<void> {
  const entry: Record<string, unknown> = { status, updatedAt: Date.now() }
  if (error !== undefined) entry.error = error
  await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .set({ analysisStatus: { [key]: entry } }, { merge: true })
}

export function markProcessing(verificationId: string, key: AnalysisRouteKey): Promise<void> {
  return writeStatus(verificationId, key, 'processing')
}

export function markCompleted(verificationId: string, key: AnalysisRouteKey): Promise<void> {
  return writeStatus(verificationId, key, 'completed')
}

export function markFailed(
  verificationId: string,
  key: AnalysisRouteKey,
  error: unknown,
): Promise<void> {
  return writeStatus(
    verificationId,
    key,
    'failed',
    error instanceof Error ? error.message : String(error),
  )
}

/** Wraps an analysis route with processing/completed/failed stamping — the
 * error is re-thrown after being recorded, so the onCall function's own
 * existing error propagation to the client is completely unaffected. */
export async function withAnalysisStatus<T>(
  verificationId: string,
  key: AnalysisRouteKey,
  run: () => Promise<T>,
): Promise<T> {
  await markProcessing(verificationId, key)
  try {
    const result = await run()
    await markCompleted(verificationId, key)
    return result
  } catch (error) {
    await markFailed(verificationId, key, error)
    throw error
  }
}

/**
 * Every analyze/*.ts onCall handler does `assertCanAnalyze` (ownership/
 * isPublic checks) BEFORE calling into the actual analysis route — and that
 * route is the only place `withAnalysisStatus` above ever runs. So a
 * verification-not-found / permission-denied / already-public rejection from
 * `assertCanAnalyze` never reaches `withAnalysisStatus` at all: no
 * 'processing', no 'failed', nothing — the client's fire-and-forget trigger
 * call (`.catch(() => {})`) swallows the error and the completion gate sees
 * an empty analysisStatus, which it reads as "not triggered yet, must still
 * be blocked by missingRequiredItems" (see verification.store.ts's
 * REQUIRED_ANALYSIS_KEYS comment) — an assumption that breaks whenever a
 * placeholder Answer already exists (every photo/audio capture writes one
 * immediately, before analysis ever runs). Wrap the ENTIRE onCall handler
 * body in this so ANY failure once verificationId is known — not just ones
 * inside the analysis route itself — leaves a 'failed' trace. Safe to nest
 * with withAnalysisStatus above: if the error actually originated inside the
 * wrapped route, this just re-records the same 'failed' status a second
 * time (harmless, not a double side effect on anything else).
 */
export async function withAnalysisFailureTrace<T>(
  verificationId: string,
  key: AnalysisRouteKey,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run()
  } catch (error) {
    await markFailed(verificationId, key, error)
    throw error
  }
}
