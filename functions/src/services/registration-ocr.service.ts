import path from 'node:path'
import sharp from 'sharp'
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js'
import { loadOpenCv, decodeImage } from './registration-document-scanner.service'
import { isLikelyRegistrationDocument } from './registration-document-template.service'
import {
  FIELD_ROIS,
  MIN_PLAUSIBLE_LENGTH,
  OCR_UPSCALE_FACTOR,
  MASK_COLOR,
  type FieldKind,
} from './registration-ocr.config'

export interface FieldResult {
  /** null when the cropped field didn't OCR into anything long enough to be
   *  plausible — caller should treat this like a failed read for that one
   *  field, not a hard crash. */
  text: string | null
  rawText: string
  /** Tesseract's own average confidence for the recognized text, 0-1. */
  confidence: number
}

export type RegistrationFields = Record<keyof typeof FIELD_ROIS, FieldResult>

export interface RegistrationScanResult {
  fields: RegistrationFields
  /** JPEG, FIELD_ROIS rows visible, everything else painted over — see
   *  renderMaskedImage(). */
  maskedImageBuffer: Buffer
  /** Local, offline template-match verdict — see
   *  registration-document-template.service.ts. Computed here (not by the
   *  caller) because it needs `warpedMat` while it's still alive; this
   *  function already owns that Mat's lifecycle (deleted in the `finally`
   *  below), so re-exposing it to a caller just to run one more check would
   *  mean handing out raw Mat ownership across a module boundary for no
   *  reason. */
  isRegistrationDocument: boolean
}

/** Bundled locally (functions/assets/tesseract/eng.traineddata.gz) instead
 *  of letting tesseract.js fetch it from jsdelivr on first use — avoids a
 *  surprise outbound call and keeps cold-start latency predictable. */
const TESSERACT_LANG_DIR = path.join(__dirname, '..', '..', 'assets', 'tesseract')

let workerPromise: Promise<Worker> | null = null

/** One worker, reused across invocations within the same warm container —
 *  re-creating it would reload the Tesseract wasm core + eng traineddata
 *  every call.
 *
 *  Uses the static top-level `createWorker` import, NOT a dynamic
 *  import('tesseract.js') inside this function — a dynamic import here
 *  left the worker's internal thread(s) spinning CPU indefinitely after
 *  finishing their actual work in ad-hoc Node testing (confirmed via CPU
 *  time: a process that had logged its own "done" a minute earlier was
 *  still burning CPU). Static import sidesteps whatever CJS/dynamic-import
 *  interop issue that was — same category of fix as the client's opencv.js/
 *  tesseract.js switch from ESM dynamic import() to classic <script>
 *  loading (see src/services/recognition/document-scanner.service.ts's
 *  git history), just the Node-side equivalent. */
function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', OEM.LSTM_ONLY, {
      langPath: TESSERACT_LANG_DIR,
      cachePath: TESSERACT_LANG_DIR,
    })
  }
  return workerPromise
}

function cleanText(text: string, kind: FieldKind): string {
  if (kind === 'digits') return text.replace(/[^0-9]/g, '')
  if (kind === 'date') return text.replace(/[^0-9.]/g, '')
  return text.replace(/[^A-Z0-9-]/gi, '').toUpperCase()
}

/**
 * Crops one FIELD_ROIS entry out of `warpedMat`, upscales it, converts to
 * grayscale + Otsu auto-threshold, and re-encodes as a PNG buffer via sharp
 * (this opencv.js build has no imencode helper — confirmed empirically — so
 * pixel data comes out through `.data` and sharp does the actual encoding,
 * same division of labour as registration-document-scanner.service.ts's
 * decode side).
 *
 * Grayscale + Otsu binarization was added after comparing color/gray/Otsu ×
 * PSM 7/8 against a real photo in projectTest/registration_ocr.py — Otsu
 * measurably improved several fields (chassisNumber went from garbled to an
 * exact match, color went from unreadable to correct) and didn't regress
 * the others, so it's now the default for every field rather than something
 * tuned per-field.
 */
async function cropFieldToPng(
  cv: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  warpedMat: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  roi: { x: number; y: number; width: number; height: number },
): Promise<Buffer> {
  const x = Math.min(warpedMat.cols - 1, Math.round(roi.x * warpedMat.cols))
  const y = Math.min(warpedMat.rows - 1, Math.round(roi.y * warpedMat.rows))
  const w = Math.max(1, Math.min(warpedMat.cols - x, Math.round(roi.width * warpedMat.cols)))
  const h = Math.max(1, Math.min(warpedMat.rows - y, Math.round(roi.height * warpedMat.rows)))

  const cropped = warpedMat.roi(new cv.Rect(x, y, w, h))
  const upscaled = new cv.Mat()
  cv.resize(
    cropped,
    upscaled,
    new cv.Size(w * OCR_UPSCALE_FACTOR, h * OCR_UPSCALE_FACTOR),
    0,
    0,
    cv.INTER_CUBIC,
  )
  cropped.delete()

  const gray = new cv.Mat()
  cv.cvtColor(upscaled, gray, cv.COLOR_RGBA2GRAY)
  upscaled.delete()
  const binary = new cv.Mat()
  cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
  gray.delete()

  const raw = Buffer.from(binary.data)
  const { cols, rows, channels } = { cols: binary.cols, rows: binary.rows, channels: binary.channels() }
  binary.delete()

  return sharp(raw, { raw: { width: cols, height: rows, channels: channels as 1 | 2 | 3 | 4 } })
    .png()
    .toBuffer()
}

/**
 * Paints MASK_COLOR over `warpedMat` everywhere except FIELD_ROIS, then
 * encodes the result as a JPEG — the on-device-pipeline-ran-server-side
 * equivalent of the client's now-removed renderFieldMask() preview. Used so
 * the admin backend can show a redacted version instead of (or alongside)
 * the raw document photo: 車主/地址/管轄編號 etc. stay hidden, only the
 * vehicle-identifying rows show through.
 */
async function renderMaskedImage(
  cv: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  warpedMat: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
): Promise<Buffer> {
  const { cols, rows } = warpedMat
  const masked = new cv.Mat(
    rows,
    cols,
    warpedMat.type(),
    new cv.Scalar(MASK_COLOR.r, MASK_COLOR.g, MASK_COLOR.b, 255),
  )

  for (const key of Object.keys(FIELD_ROIS) as Array<keyof typeof FIELD_ROIS>) {
    const roi = FIELD_ROIS[key].roi
    const x = Math.min(cols - 1, Math.round(roi.x * cols))
    const y = Math.min(rows - 1, Math.round(roi.y * rows))
    const w = Math.max(1, Math.min(cols - x, Math.round(roi.width * cols)))
    const h = Math.max(1, Math.min(rows - y, Math.round(roi.height * rows)))
    const rect = new cv.Rect(x, y, w, h)
    const src = warpedMat.roi(rect)
    const dst = masked.roi(rect)
    src.copyTo(dst)
    src.delete()
    dst.delete()
  }

  const raw = Buffer.from(masked.data)
  const channels = masked.channels()
  masked.delete()

  return sharp(raw, { raw: { width: cols, height: rows, channels: channels as 1 | 2 | 3 | 4 } })
    .jpeg({ quality: 85 })
    .toBuffer()
}

/**
 * Corner-detects + perspective-crops a 行照 photo, then OCRs just the
 * vehicle-identifying fields defined in FIELD_ROIS — entirely within this
 * Trusted Backend process. The photo is never sent to Gemini or any
 * third-party vision API; this replaces that call in
 * vehicle-registration.service.ts specifically so the full document image
 * (including 車主/地址) never leaves our own infrastructure. Browser twin:
 * src/services/recognition/registration-ocr.service.ts (used for the
 * client's own on-device preview, not for the actual pass/fail decision).
 *
 * 2026-10: no longer runs scanDocument's corner-detect + perspective warp —
 * decodeImage() just decodes the photo as-is. The capture is already
 * cropped to a fixed-aspect-ratio guide box the user aligned the physical
 * document to (RegistrationDocumentCapture.vue), so there's no longer an
 * arbitrary angle/crop to correct for; running corner-detection on an
 * already-tightly-cropped photo turned out to make things WORSE, not
 * better, confirmed on a real failed capture — see decodeImage()'s own doc
 * comment in registration-document-scanner.service.ts for why. "Is this
 * actually a 行照" is now entirely isLikelyRegistrationDocument's job below
 * (template match), not scanDocument's old "found a document-shaped quad"
 * check.
 */
export async function scanRegistrationDocument(
  imageBuffer: Buffer,
): Promise<RegistrationScanResult> {
  const cv = await loadOpenCv()
  const warpedMat = await decodeImage(imageBuffer)

  try {
    const isRegistrationDocument = await isLikelyRegistrationDocument(cv, warpedMat)

    const worker = await getWorker()
    const fields = {} as RegistrationFields

    for (const key of Object.keys(FIELD_ROIS) as Array<keyof typeof FIELD_ROIS>) {
      const definition = FIELD_ROIS[key]
      const png = await cropFieldToPng(cv, warpedMat, definition.roi)
      // Every FIELD_ROIS crop is one text line — PSM.SINGLE_LINE instead of
      // Tesseract's default full-page layout analysis measurably cut
      // garbage output on real photos (the default kept trying to segment
      // a 35px-tall strip into blocks/paragraphs and got confused whenever
      // a Chinese field label sat right next to the alnum value).
      //
      // No tessedit_char_whitelist — compared with/without it against a real
      // photo (projectTest/registration_ocr.py) and the whitelist was
      // quietly crushing Tesseract's own confidence score even when the
      // recognized text was correct (same text, ~40% confidence without the
      // whitelist vs 0% with it). Unrestricted recognition + cleanText()
      // filtering afterward gives both a usable confidence number and the
      // same filtered output.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE })
      const { data } = await worker.recognize(png)
      const cleaned = cleanText(data.text, definition.kind)
      fields[key] = {
        text: cleaned.length >= MIN_PLAUSIBLE_LENGTH[definition.kind] ? cleaned : null,
        rawText: data.text,
        confidence: data.confidence / 100,
      }
    }

    const maskedImageBuffer = await renderMaskedImage(cv, warpedMat)
    return { fields, maskedImageBuffer, isRegistrationDocument }
  } finally {
    warpedMat.delete()
  }
}
