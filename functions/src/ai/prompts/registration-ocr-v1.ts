export const REGISTRATION_OCR_PROMPT_VERSION = 'ocr-registration-v1'

/** 行照 OCR — a separate, unrelated flow from the Verification checklist's
 *  dashboard-ocr-v2 (see vehicle-registration.service.ts). Moved out of that
 *  service file into ai/prompts/ so it follows the same "every prompt lives
 *  here" convention as every other prompt, and so it can be admin-overridden
 *  through the same aiPrompts/{key} mechanism (see prompt-config.service.ts).
 *
 *  2026-09: narrowed to engineNumber only (chassisNumber dropped) — this
 *  route's OCR result is display-only now (verifyVehicleRegistration always
 *  passes on any uploaded photo regardless of what OCR finds), so it only
 *  extracts the one field the UI still shows. */
export const REGISTRATION_OCR_PROMPT = `Read the motorcycle vehicle registration certificate (行照) photo.

Extract exactly as printed on the document:
- engineNumber: the engine number (引擎號碼)

If the field is unclear, obstructed, or cannot be read reliably, set it to null.
Do not guess a plausible-looking value.

If the supplied image clearly is not a vehicle registration certificate at all (for example: an unrelated object, a toy, a person, or an empty/irrelevant scene), set engineNumber to null and state in note that the supplied evidence does not appear to show a registration certificate.

The note field (if present) must be written in Traditional Chinese (繁體中文，台灣用語習慣) — never Simplified Chinese, never English, never a mix of languages.

Return only the requested JSON shape: { engineNumber, confidence, note }.`
