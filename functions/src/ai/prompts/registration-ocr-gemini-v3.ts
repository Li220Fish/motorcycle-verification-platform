export const REGISTRATION_OCR_GEMINI_V3_PROMPT_VERSION = 'registration-ocr-gemini-v3'

/**
 * 2026-10 v3: scaled down to ONLY engineNumber (引擎號碼) — the earlier v2
 * schema asked for 6 fields, which turned out to need a 6-box guided-camera
 * overlay too fiddly to actually align in practice. Only engineNumber is
 * actually required for the pass/fail decision, so this is now the only
 * thing asked for; accuracy matters more than breadth here.
 *
 * Also no longer asked to judge isRegistrationDocument — that's now a
 * local, offline, non-API check (registration-document-template.service.ts,
 * classic OpenCV template matching against a known printed label) that runs
 * BEFORE this prompt is ever called. This call is never reached at all for
 * a photo that didn't already pass that local check.
 *
 * Still privacy-safe by construction: this is NEVER called on the original
 * photo, only on the image AFTER renderMaskedImage() paints over everything
 * except the engineNumber row — see vehicle-registration.service.ts.
 */
export const REGISTRATION_OCR_GEMINI_V3_PROMPT = `Read a photo of a Taiwanese motorcycle vehicle registration certificate (行照). It has already been confirmed to be a registration certificate — do not re-judge that.

Most of the image has been intentionally painted a solid red block — this is
expected, not image corruption or damage. It hides information that is
irrelevant here. Only one horizontal strip is left visible: the 引擎號碼
(engine number) row.

Extract engineNumber exactly as printed in that visible strip — alphanumeric,
typically with a hyphen, e.g. "DB214519" or "3UR-301092". If the strip is
blank, unclear, obstructed, or cut off, set engineNumber to null — do not
guess a plausible-looking value.

confidence: your confidence (0-1) in the extracted engineNumber. A clearly
printed, unambiguous read should score high; anything you had to guess at
or that could be read more than one way should score low.

note (Traditional Chinese, 繁體中文，台灣用語習慣 — never Simplified Chinese,
never English, never a mix of languages): if engineNumber is null, briefly
state that the engine number could not be read reliably (e.g. 模糊、反光、
被遮擋), so the user knows to retake it. If it succeeded, note may be null.

Return only the requested JSON shape: { engineNumber, confidence, note }.`
