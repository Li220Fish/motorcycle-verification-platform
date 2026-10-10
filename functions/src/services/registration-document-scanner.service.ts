import sharp from 'sharp'
import cvReadyPromise from '@techstark/opencv-js'

/**
 * OpenCV.js types ship via "mirada" and the package's own README warns they
 * can lag the actual WASM build — using `any` here rather than fighting
 * typings that aren't authoritative anyway (same approach as the client's
 * src/services/recognition/document-scanner.service.ts).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cv = any

let cvPromise: Promise<Cv> | null = null

/** Exported so registration-ocr.service.ts can reuse the same WASM module
 *  instance (and its one-time init) for cropping/pixel access. */
export function loadOpenCv(): Promise<Cv> {
  if (!cvPromise) cvPromise = resolveOpenCv()
  return cvPromise
}

async function resolveOpenCv(): Promise<Cv> {
  const cvModule = cvReadyPromise as Cv
  const cv = cvModule instanceof Promise ? await cvModule : cvModule
  if (cv.Mat) return cv
  await new Promise<void>((resolve) => {
    cv.onRuntimeInitialized = () => resolve()
  })
  return cv
}

/**
 * Decodes `imageBuffer` straight into a cv.Mat with NO corner-detection or
 * perspective warp.
 *
 * 2026-10: this used to be scanDocument() — corner-detect the document's
 * quadrilateral in an arbitrarily-angled/cropped photo, then perspective-
 * warp it flat, specifically so FIELD_ROIS's fixed ratios would still land
 * on the right rows regardless of how the photo was framed. That assumption
 * no longer holds the way it used to: RegistrationDocumentCapture.vue now
 * crops every capture to a fixed-aspect-ratio guide box the user aligns the
 * physical document to, so there's no longer an arbitrary angle/crop left to
 * correct for. Keeping the corner-detection step turned out to be actively
 * harmful on top of merely unnecessary — confirmed on a real failed capture,
 * contour-based edge detection gets LESS reliable (not more) once the
 * document already fills almost the entire frame edge-to-edge, since
 * there's barely any background left to find a contrast edge against; the
 * quad it finds can end up looser than the guide box itself was, re-
 * introducing the exact ROI-drifts-into-the-wrong-row problem the guided
 * capture was built to eliminate in the first place. Trusting the guide
 * box's own alignment and skipping the extra geometric transform removes
 * that failure mode entirely.
 *
 * This opencv.js build has no imread/imdecode helpers available (confirmed
 * empirically — only the raw Mat API), so sharp does the image codec work
 * (decode to raw RGBA for cv.Mat construction). CALLER OWNS the returned Mat
 * and must call .delete() when done.
 */
export async function decodeImage(imageBuffer: Buffer): Promise<Cv> {
  const cv = await loadOpenCv()
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const mat = new cv.Mat(info.height, info.width, cv.CV_8UC4)
  mat.data.set(data)
  return mat
}
