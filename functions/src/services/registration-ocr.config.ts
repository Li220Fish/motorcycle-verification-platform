/**
 * Server-side counterpart of src/config/registrationOcr.config.ts — the ROI
 * ratios MUST stay in sync with that file (both describe the same physical
 * 行照 layout). Duplicated rather than shared because functions/ and the
 * client app are separate TypeScript projects with no shared package today;
 * if the ROIs ever need recalibrating, update both files together.
 */
export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export type FieldKind = 'alnum' | 'digits' | 'date'

export interface FieldDefinition {
  roi: NormalizedRect
  kind: FieldKind
}

/**
 * 2026-10 v3: scaled back down to ONLY engineNumber — the earlier 6-field
 * version (plateNumber/chassisNumber/color/displacement/manufactureDate)
 * made the guided-camera overlay too fiddly to actually line up in practice
 * (RegistrationDocumentCapture.vue had to show 6 separate boxes), and only
 * engineNumber is actually required for a pass/fail decision. Coordinates
 * calibrated against a real sample 行照 photo using
 * projectTest/roi-picker.html (drag-to-adjust tool over a warped photo,
 * exports this exact literal). If a different phone/photo's detected quad
 * ends up a notably different aspect ratio, redo the same process: run
 * projectTest/registration_ocr.py to get a fresh warped photo, open it in
 * roi-picker.html, adjust, re-copy.
 */
export const FIELD_ROIS: Record<string, FieldDefinition> = {
  engineNumber: { roi: { x: 0.173, y: 0.425, width: 0.778, height: 0.065 }, kind: 'alnum' },
}

export const MIN_PLAUSIBLE_LENGTH: Record<FieldKind, number> = { alnum: 4, digits: 2, date: 6 }

/** OCR 前把裁切出的小圖放大幾倍，字太小辨識率會明顯下降。 */
export const OCR_UPSCALE_FACTOR = 3

/** renderFieldMask() 遮住不需要欄位時用的顏色 — 跟 client 端除錯預覽
 *  （已移除）用過的紅色一致。 */
export const MASK_COLOR = { r: 255, g: 0, b: 0 }
