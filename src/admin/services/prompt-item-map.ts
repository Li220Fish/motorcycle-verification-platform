/**
 * Which checklist item(s) each `aiPrompts/{key}` entry actually drives —
 * purely informational, for PromptsSection.vue's editor so an admin editing
 * a prompt's text can see what it touches before saving (this file has no
 * runtime effect on analysis itself; the real routing lives in each Cloud
 * Function's own `resolvePromptText(key)` call — see functions/src/services/
 * core-vision-split.service.ts, cold-touch.service.ts, engine-sensor-session
 * .service.ts, ocr.service.ts). Kept hand-in-sync with those call sites
 * rather than derived, since there's no single shared source for "prompt key
 * → item ids" spanning both the client and Cloud Functions builds.
 *
 * `global-inspection-v2` is the shared prefix every one of the 4 Core Vision
 * routes concatenates onto its own group prompt (see core-vision-split
 * .service.ts) — editing it affects all 6 APR-* items those 4 routes cover
 * together, so it lists their union. Each `core-vision-*-v1` entry below
 * only lists the item(s) that ONE specific route actually analyzes (2026-09
 * split — the original single `core-vision-v2` covered all 6 in one call).
 * `APR-transmission-chain` is conditional (only vehicles with an exposed
 * chain ever actually send it — see hasExposedChainSprocket) but still
 * listed under `core-vision-engine-bottom-v1`, since the prompt text applies
 * to it whenever it does run.
 */
export interface PromptItemMapping {
  itemIds: string[]
  /** Shown instead of item chips for a prompt that drives something outside
   *  the seller/buyer checklist entirely (行照 OCR is its own vehicle
   *  verification flow, not a checklist item — see
   *  vehicle-registration.service.ts). */
  note?: string
}

export const PROMPT_ITEM_MAP: Record<string, PromptItemMapping> = {
  'global-inspection-v2': {
    itemIds: [
      'APR-left-side',
      'APR-right-side',
      'APR-rear',
      'APR-front-suspension',
      'APR-engine-bottom',
      'APR-transmission-chain',
    ],
  },
  'core-vision-sides-v1': { itemIds: ['APR-left-side', 'APR-right-side'] },
  'core-vision-rear-v1': { itemIds: ['APR-rear'] },
  'core-vision-front-suspension-v1': { itemIds: ['APR-front-suspension'] },
  'core-vision-engine-bottom-v1': { itemIds: ['APR-engine-bottom', 'APR-transmission-chain'] },
  'dashboard-ocr-v2': { itemIds: ['APR-dashboard'] },
  'cold-engine-touch-v3': { itemIds: ['ENG-02'] },
  'engine-audio-v2': { itemIds: ['ENG-03', 'ENG-04', 'ENG-05', 'ENG-06'] },
  'registration-ocr-v1': {
    itemIds: [],
    note: '行照 OCR — 車輛認證流程的一部分，不屬於驗車檢查表項目。',
  },
}
