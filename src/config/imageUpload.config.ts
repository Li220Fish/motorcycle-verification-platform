/**
 * Central tunables for evidence photo compression + background upload.
 * Nothing in this pass should hard-code a quality/resolution/retry number
 * anywhere else — components and services import from here.
 */

/** Longest side (px) a compressed evidence photo is resized to. Chosen to
 * stay well above what Gemini Vision/OCR needs to judge condition/read text,
 * while cutting a typical 12MP+ phone photo down to a small upload. */
export const MAX_LONG_EDGE = 1600

/** JPEG/WebP encode quality (0-1) for compressed evidence photos. */
export const IMAGE_QUALITY = 0.8

/** Automatic background-upload retry attempts before an evidence item is
 * surfaced to the user as `failed` (manual retry from there). */
export const MAX_RETRY_COUNT = 3

/** Backoff delay (ms) before each automatic retry, indexed by attempt number
 * (0-based) — last value repeats if retryCount somehow exceeds the array. */
export const RETRY_BACKOFF_MS = [5000, 15000, 45000]

export function retryDelayFor(retryCount: number): number {
  return RETRY_BACKOFF_MS[Math.min(retryCount, RETRY_BACKOFF_MS.length - 1)]
}
