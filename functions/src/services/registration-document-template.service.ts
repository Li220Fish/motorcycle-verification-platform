import path from 'node:path'
import sharp from 'sharp'

/**
 * Local, offline "is this actually a 行照" check — classic OpenCV template
 * matching, not an ML model and not an API call. 2026-10: replaces asking
 * Gemini's isRegistrationDocument judgement, specifically so the document-
 * type gate doesn't depend on a network call or third-party cost at all —
 * only the (now engine-number-only) OCR read itself still goes to Gemini.
 *
 * How it works: every real 行照 prints the same "引號/擎碼" (engine number
 * row label) glyphs, in the same ink, at the same position relative to the
 * document's own table border, regardless of which specific vehicle/owner
 * it is — it's a government form template, not free text. A cropped
 * reference image of that label (functions/assets/templates/
 * engine-number-label.jpg, taken from a real scanned 行照) gets correlated
 * against the same region of the freshly-warped photo; a real 行照 should
 * match closely, and anything else (a different document, a random photo,
 * a blank card) shouldn't.
 *
 * Threshold calibrated empirically (see projectTest/registration_ocr.py's
 * test history): real matches across three different real photos (different
 * phones/lighting/paper) scored 0.68-1.0; adversarial negatives (random
 * noise, a blank card, the same document rotated 180°) scored 0.0-0.35. 0.5
 * sits with comfortable margin on both sides.
 */

const CANONICAL_WIDTH = 1000
const SEARCH_REGION = { x: 0, y: 0.36, width: 0.26, height: 0.2 }
const SCALE_STEPS = [0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15]
const MATCH_THRESHOLD = 0.5

const TEMPLATE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'assets',
  'templates',
  'engine-number-label.jpg',
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cv = any

let templateMatPromise: Promise<Cv> | null = null

/** Decodes the bundled reference crop into a single-channel (grayscale) cv.Mat,
 *  once per warm container — same reuse pattern as registration-ocr.service
 *  .ts's Tesseract worker. */
function loadTemplateMat(cv: Cv): Promise<Cv> {
  if (!templateMatPromise) {
    templateMatPromise = (async () => {
      const { data, info } = await sharp(TEMPLATE_PATH)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const mat = new cv.Mat(info.height, info.width, cv.CV_8UC1)
      mat.data.set(data)
      return mat
    })()
  }
  return templateMatPromise
}

/** Resizes to a fixed canonical width so the template (cropped at one fixed
 *  scale) lines up with documents warped to varying absolute pixel sizes —
 *  matchTemplate itself has no scale invariance, so this (plus the
 *  multi-scale search below) stands in for it. */
function toCanonicalGray(cv: Cv, mat: Cv): Cv {
  const scale = CANONICAL_WIDTH / mat.cols
  const resized = new cv.Mat()
  cv.resize(
    mat,
    resized,
    new cv.Size(CANONICAL_WIDTH, Math.round(mat.rows * scale)),
    0,
    0,
    cv.INTER_AREA,
  )
  const gray = new cv.Mat()
  cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY)
  resized.delete()
  return gray
}

/**
 * Returns the best normalized-cross-correlation score (0-1-ish; can go
 * slightly negative for an anti-match) found across a handful of template
 * scales within the expected search region. Caller compares against
 * MATCH_THRESHOLD — exported as a constant below rather than baked into
 * this function so a caller can log the raw score for tuning.
 */
export async function registrationLabelMatchScore(cv: Cv, warpedMat: Cv): Promise<number> {
  const template = await loadTemplateMat(cv)
  const canonical = toCanonicalGray(cv, warpedMat)

  try {
    const h = canonical.rows
    const w = canonical.cols
    const sx = Math.round(SEARCH_REGION.x * w)
    const sy = Math.round(SEARCH_REGION.y * h)
    const sw = Math.min(w - sx, Math.round(SEARCH_REGION.width * w))
    const sh = Math.min(h - sy, Math.round(SEARCH_REGION.height * h))
    if (sw <= 0 || sh <= 0) return -1
    const search = canonical.roi(new cv.Rect(sx, sy, sw, sh))

    let best = -1
    try {
      for (const scale of SCALE_STEPS) {
        const th = Math.round(template.rows * scale)
        const tw = Math.round(template.cols * scale)
        if (th < 8 || tw < 8 || th >= search.rows || tw >= search.cols) continue
        const scaledTemplate = new cv.Mat()
        cv.resize(template, scaledTemplate, new cv.Size(tw, th), 0, 0, cv.INTER_AREA)
        const result = new cv.Mat()
        cv.matchTemplate(search, scaledTemplate, result, cv.TM_CCOEFF_NORMED)
        const { maxVal } = cv.minMaxLoc(result)
        best = Math.max(best, maxVal)
        scaledTemplate.delete()
        result.delete()
      }
    } finally {
      search.delete()
    }
    return best
  } finally {
    canonical.delete()
  }
}

export async function isLikelyRegistrationDocument(cv: Cv, warpedMat: Cv): Promise<boolean> {
  const score = await registrationLabelMatchScore(cv, warpedMat)
  return score >= MATCH_THRESHOLD
}
