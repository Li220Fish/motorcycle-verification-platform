import type { AiCheckKind, VerificationItem } from './verification.types'

/** Rect on the shared 300x150 MotorcycleDiagram viewBox (see
 *  MotorcycleDiagram.vue / AppearanceCaptureMap.vue) — schematic, not
 *  pixel-accurate, since the diagram is a single side-view silhouette (some
 *  items, e.g. engine-left/engine-right or left-side/right-side, share one
 *  region since a 2D side profile can't spatially distinguish them). */
export interface DiagramRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * The 車身外觀 photo checklist — Verification v2 (see
 * MotoVerify Verification v2 Migration spec §1/§2/§6). Steps 9/10/11/16/17/
 * 20/23 (車牌/前輪/後輪/引擎左側/引擎右側/排氣管/車身號碼) are fully removed —
 * not hidden, deleted from the registry. Steps 13/14/15/21/22 (後避震/前煞車/
 * 後煞車/三角台/坐墊外觀) went through the same two-stage retirement: first
 * downgraded to Optional self-disclosure photo slots (their AI checks
 * retired along with the old Group B/C pipeline — see
 * functions/src/services/core-vision-v2.service.ts), then removed outright
 * here once 基本12項健檢 (BasicHealthCheck13.vue, now wired into
 * seller-verification.ts as its own tab) started covering exactly the same
 * ground with its own tap markers — same reasoning ELEC-01..09 already went
 * through (see seller-verification.ts's `electric` comment). 其他改裝品
 * (`modifications`) is removed for the same reason: its `aiCheck:
 * 'appearance'` was already vestigial (never in verification.store.ts's
 * CORE_VISION_TRIGGER_GROUPS, a leftover from the retired Group A pipeline),
 * so it was really just a photo-only Optional disclosure item — now
 * superseded by 基本12項健檢's own 其他改裝品 note field.
 * RETIRED_PHOTO_SLOT_LABELS below keeps each removed slot's Chinese label
 * available for admin display of pre-existing historical answers under
 * these now-gone item ids (see scripts/migrate-basic-health-check-answers.mjs
 * and VerifyDetailSection.vue's itemTitle()) — this file only ever removes a
 * slot from the live registry, never its label.
 */
export interface PhotoSlot {
  id: string
  label: string
  description: string
  required: boolean
  aiCheck?: AiCheckKind
  instruction?: string
  helpText?: string
  transmissionSensitive?: boolean
  /** Typically-dim shooting position (under the vehicle, behind fork/shock
   *  tubes, etc.) — the capture screen suggests turning on the phone's torch
   *  for these. Not auto-detected from the live preview (no reliable
   *  brightness signal available without a custom camera-preview plugin);
   *  this is a static, content-authored hint. */
  lowLight?: boolean
  /** This item's own position on the diagram — shown directly on the capture
   *  screen (PhotoGuide.vue) so every photo has its own precise target
   *  instead of sharing its whole Capture Map group's region. */
  highlight: DiagramRect
}

const FULL_BODY: DiagramRect = { x: 10, y: 35, w: 280, h: 115 }

export const REQUIRED_PHOTO_SLOTS: PhotoSlot[] = [
  {
    id: 'left-side',
    label: '車輛左側',
    description:
      '拍攝完整左側。AI檢查：刮傷、裂痕、凹陷、疑似補漆、色差、明顯改裝、車體外觀不對稱。',
    required: true,
    aiCheck: 'appearance',
    helpText: '一張照片可產生多項結果。',
    highlight: FULL_BODY,
  },
  {
    id: 'right-side',
    label: '車輛右側',
    description:
      '拍攝完整右側。AI檢查：刮傷、裂痕、凹陷、疑似補漆、色差、明顯改裝、車體外觀不對稱。',
    required: true,
    aiCheck: 'appearance',
    helpText: '與左側共同分析。',
    highlight: FULL_BODY,
  },
  {
    id: 'dashboard',
    label: '儀表板',
    description: '通電後拍攝。AI檢查：儀表顯示狀況、螢幕外觀、里程顯示、可辨識的異常警示燈。',
    required: true,
    aiCheck: 'odometer',
    instruction: '請先通電，再拍攝儀表板',
    helpText: '只拍儀表板。',
    highlight: { x: 225, y: 30, w: 60, h: 35 },
  },
  {
    id: 'rear',
    label: '車尾',
    description: 'AI檢查：刮傷、裂痕、破損、左右明顯不對稱及其他可見異常。',
    required: true,
    aiCheck: 'appearance',
    highlight: { x: 5, y: 70, w: 45, h: 30 },
  },
  {
    id: 'front-suspension',
    label: '前避震',
    description: 'AI檢查：漏油、鏽蝕、刮傷、異常噴漆及其他外觀異常。',
    required: true,
    aiCheck: 'appearance',
    lowLight: true,
    highlight: { x: 225, y: 55, w: 35, h: 35 },
  },
  {
    id: 'engine-bottom',
    label: '引擎底部',
    description: 'AI檢查：滲油、滲液、刮傷、護蓋及其他可見異常。',
    required: true,
    aiCheck: 'appearance',
    lowLight: true,
    highlight: { x: 110, y: 108, w: 60, h: 20 },
  },
  {
    id: 'transmission-chain',
    label: '傳動／鏈條區域',
    description: 'AI檢查：可見鏽蝕、異常磨耗、拆裝痕跡及外觀異常。',
    required: true,
    aiCheck: 'appearance',
    transmissionSensitive: true,
    lowLight: true,
    helpText:
      '僅有外露鏈條的車輛需要本項目；速可達等無外露鏈條車輛由系統自動判定為不適用，不需拍攝。照片不判斷異音。',
    highlight: { x: 70, y: 100, w: 55, h: 20 },
  },
]

/** Chinese label for each item id removed from REQUIRED_PHOTO_SLOTS above —
 *  keyed the same prefix-agnostic way as getPhotoSlotByItemId (matches on
 *  the trailing `-${slot id}`) so admin can still show a real label instead
 *  of a raw itemId string for a historical verification's pre-migration
 *  answer under one of these ids (see this file's top comment). */
const RETIRED_PHOTO_SLOTS: Record<string, string> = {
  'rear-suspension': '後避震',
  'front-brake': '前煞車',
  'rear-brake': '後煞車',
  'triple-clamp': '三角台',
  seat: '坐墊外觀',
  modifications: '其他改裝品',
}

export function getRetiredPhotoSlotLabel(itemId: string): string | undefined {
  const match = Object.entries(RETIRED_PHOTO_SLOTS).find(([slotId]) =>
    itemId.endsWith(`-${slotId}`),
  )
  return match ? `${match[1]}（舊版項目，已併入基本12項健檢）` : undefined
}

export function buildPhotoSlotItems(idPrefix: string): VerificationItem[] {
  return REQUIRED_PHOTO_SLOTS.map((slot) => ({
    id: `${idPrefix}-${slot.id}`,
    title: slot.label,
    description: slot.description,
    instruction: slot.instruction ?? `請拍攝：${slot.label}`,
    type: 'photo',
    required: slot.required,
    evidence: [{ kind: 'photo', label: slot.label, required: slot.required }],
    aiCheck: slot.aiCheck,
    transmissionSensitive: slot.transmissionSensitive,
    lowLight: slot.lowLight,
    helpText: slot.helpText,
    // Verification v2 §2 — Optional items are self-disclosure, not a plain
    // "did you take the photo" checkbox: normal = 車主主動表示目前未發現需要
    // 注意, attention = 車主主動表示存在需要注意的狀況. `missing` per spec is
    // simply "no answer at all" (no selectable option needed for it — see
    // scoring.service.ts's scorableAnswers, which already excludes Optional
    // items regardless of whether they were answered).
    options: slot.required
      ? undefined
      : [
          { value: 'normal', label: '未發現需要注意的狀況' },
          { value: 'attention', label: '有需要注意的狀況' },
          { value: 'not_applicable', label: '此車型不適用' },
        ],
  }))
}

/** Looks up a photo slot by its generated item id (`${idPrefix}-${slot.id}`)
 *  — prefix-agnostic since it matches on the trailing `-${slot.id}` rather
 *  than assuming a specific prefix, so it keeps working for any flow that
 *  reuses these slots under a different id prefix. */
export function getPhotoSlotByItemId(itemId: string): PhotoSlot | undefined {
  return REQUIRED_PHOTO_SLOTS.find((slot) => itemId.endsWith(`-${slot.id}`))
}
