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

/** The 車身外觀 photo checklist — steps 5–24 of the frozen 45-step flow. */
export interface PhotoSlot {
  id: string
  label: string
  description: string
  required: boolean
  aiCheck?: AiCheckKind
  instruction?: string
  helpText?: string
  transmissionSensitive?: boolean
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
    id: 'plate',
    label: '車牌',
    description: '拍攝並辨識車牌，可與車輛註冊資料交叉確認。',
    required: true,
    aiCheck: 'plate',
    helpText: '車牌資料本身仍屬私人 Vehicle 資料。',
    highlight: { x: 8, y: 94, w: 22, h: 16 },
  },
  {
    id: 'front-wheel',
    label: '前輪',
    description: 'AI檢查：胎紋、龜裂、偏磨、明顯損傷、可見平衡塊及其他異常。',
    required: true,
    aiCheck: 'appearance',
    instruction: '請拍攝：前輪胎面＋側面',
    highlight: { x: 215, y: 82, w: 60, h: 60 },
  },
  {
    id: 'rear-wheel',
    label: '後輪',
    description: 'AI檢查：胎紋、龜裂、偏磨、明顯損傷、可見平衡塊及其他異常。',
    required: true,
    aiCheck: 'appearance',
    instruction: '請拍攝：後輪胎面＋側面',
    highlight: { x: 25, y: 82, w: 60, h: 60 },
  },
  {
    id: 'front-suspension',
    label: '前避震',
    description: 'AI檢查：漏油、鏽蝕、刮傷、異常噴漆及其他外觀異常。',
    required: true,
    aiCheck: 'appearance',
    highlight: { x: 225, y: 55, w: 35, h: 35 },
  },
  {
    id: 'rear-suspension',
    label: '後避震',
    description: 'AI檢查：漏油、鏽蝕、刮傷、異常噴漆及其他外觀異常。',
    required: true,
    aiCheck: 'appearance',
    highlight: { x: 75, y: 70, w: 35, h: 30 },
  },
  {
    id: 'front-brake',
    label: '前煞車',
    description: 'AI檢查：碟盤、卡鉗、鏽蝕、可見磨耗及明顯外觀異常。',
    required: true,
    aiCheck: 'appearance',
    highlight: { x: 225, y: 95, w: 35, h: 35 },
  },
  {
    id: 'rear-brake',
    label: '後煞車',
    description: 'AI檢查：碟盤／鼓煞區域、鏽蝕、可見磨耗及明顯外觀異常。',
    required: true,
    aiCheck: 'appearance',
    helpText: '依車型（碟煞／鼓煞）不同顯示拍攝提示。',
    highlight: { x: 40, y: 95, w: 35, h: 35 },
  },
  {
    id: 'engine-left',
    label: '引擎左側',
    description: 'AI檢查：滲漏、鏽蝕、異常噴漆、螺絲拆裝痕跡、護蓋、汽缸頭等可見狀況。',
    required: true,
    aiCheck: 'appearance',
    instruction: '請拍攝：引擎左側＋主要螺絲',
    highlight: { x: 110, y: 88, w: 60, h: 35 },
  },
  {
    id: 'engine-right',
    label: '引擎右側',
    description: 'AI檢查：滲漏、鏽蝕、異常噴漆、螺絲拆裝痕跡、進氣歧管等可見狀況。',
    required: true,
    aiCheck: 'appearance',
    instruction: '請拍攝：引擎右側＋主要螺絲',
    highlight: { x: 110, y: 88, w: 60, h: 35 },
  },
  {
    id: 'engine-bottom',
    label: '引擎底部',
    description: 'AI檢查：滲油、滲液、刮傷、護蓋及其他可見異常。',
    required: true,
    aiCheck: 'appearance',
    highlight: { x: 110, y: 108, w: 60, h: 20 },
  },
  {
    id: 'transmission-chain',
    label: '傳動／鏈條區域',
    description: 'AI檢查：可見鏽蝕、異常磨耗、拆裝痕跡及外觀異常。',
    required: true,
    aiCheck: 'appearance',
    transmissionSensitive: true,
    helpText: '速克達與檔車使用不同拍攝提示；照片不判斷異音。',
    highlight: { x: 70, y: 100, w: 55, h: 20 },
  },
  {
    id: 'exhaust',
    label: '排氣管',
    description: 'AI檢查：鏽蝕、撞傷、異常污漬、接合處可見異常。',
    required: true,
    aiCheck: 'appearance',
    instruction: '請拍攝：排氣管＋接合處',
    highlight: { x: 60, y: 112, w: 110, h: 15 },
  },
  {
    id: 'triple-clamp',
    label: '三角台',
    description: 'AI檢查：鏽蝕、止點、主要螺絲拆裝痕跡及明顯異常。',
    required: true,
    aiCheck: 'appearance',
    highlight: { x: 215, y: 45, w: 35, h: 25 },
  },
  {
    id: 'seat',
    label: '坐墊外觀',
    description: 'AI檢查：破損、裂痕、異常磨耗、明顯修補。',
    required: true,
    aiCheck: 'appearance',
    helpText: '目前只拍坐墊外觀。',
    highlight: { x: 85, y: 75, w: 130, h: 20 },
  },
  {
    id: 'vin',
    label: '車身號碼位置',
    description: 'OCR辨識車身號碼，與車輛註冊／身份綁定資料比對。',
    required: true,
    aiCheck: 'vin',
    helpText: '不把原始車身號碼放入公開報告。',
    highlight: { x: 190, y: 55, w: 30, h: 25 },
  },
  {
    id: 'modifications',
    label: '其他改裝品',
    description: '拍攝所有可見改裝。AI描述改裝類型、位置及可見異常。',
    required: false,
    aiCheck: 'appearance',
    helpText: '不讓 AI 猜測改裝原因。',
    highlight: FULL_BODY,
  },
]

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
    helpText: slot.helpText,
    options: slot.required
      ? undefined
      : [
          { value: 'normal', label: '已拍攝' },
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
