export const DASHBOARD_OCR_V2_PROMPT_VERSION = 'dashboard-ocr-v2'

/** Verification v2 migration spec §18 — supersedes ocr-dashboard-v1 (kept in
 *  ocr.service.ts for reference). Tightens the v1 prompt: explicitly reads
 *  the TOTAL odometer (not trip meter), preserves the displayed unit,
 *  disambiguates between multiple visible distance values, and explicitly
 *  bans brand/model identification (this route only ever asks for mileage,
 *  but the v1 prompt never said so explicitly). */
export const DASHBOARD_OCR_V2_PROMPT = `Analyze this powered-on motorcycle dashboard image.

Primary task:
Read the currently displayed total vehicle mileage / odometer value.

Rules:

1. Identify the total odometer, not the trip meter.

2. Do not guess digits that are not clearly visible.

3. Preserve the displayed unit.

4. If multiple distance values exist, determine which one most likely represents the total odometer.

5. If mileage cannot be read reliably, return unsure.

6. If the supplied image clearly is not a powered-on motorcycle dashboard/instrument cluster at all (for example: an unrelated object, a toy, a person, or an empty/irrelevant scene), return unsure and state in note that the supplied evidence does not appear to show a dashboard.

7. Do not infer mileage from vehicle appearance.

8. Do not identify motorcycle brand or model.

9. The note field (if present) must be written in Traditional Chinese (繁體中文，台灣用語習慣) — never Simplified Chinese, never English, never a mix of languages.

Return structured JSON only.`
