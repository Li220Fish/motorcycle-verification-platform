import type { VerificationItem } from './verification.types'

/** The Seller 車身外觀 photo checklist (steps 27–46 of the reduced flow). */
export const REQUIRED_PHOTO_SLOTS: Array<{ id: string; label: string; required: boolean }> = [
  { id: 'left-side', label: '車輛左側', required: true },
  { id: 'right-side', label: '車輛右側', required: true },
  { id: 'front', label: '車頭', required: true },
  { id: 'rear', label: '車尾', required: true },
  { id: 'plate', label: '車牌', required: true },
  { id: 'front-wheel', label: '前輪', required: true },
  { id: 'rear-wheel', label: '後輪', required: true },
  { id: 'front-fork', label: '前避震', required: true },
  { id: 'rear-fork', label: '後避震', required: true },
  { id: 'front-brake', label: '前煞車', required: true },
  { id: 'rear-brake', label: '後煞車', required: true },
  { id: 'engine-left', label: '引擎左側', required: true },
  { id: 'engine-right', label: '引擎右側', required: true },
  { id: 'engine-bottom', label: '引擎底部', required: true },
  { id: 'cvt', label: '傳動區域', required: true },
  { id: 'exhaust', label: '排氣管', required: true },
  { id: 'triple-clamp', label: '三角台', required: true },
  { id: 'under-seat', label: '坐墊下（電路／車廂空間）', required: true },
  { id: 'vin', label: '車身號碼位置', required: true },
  { id: 'modifications', label: '其他改裝品', required: false },
]

export function buildPhotoSlotItems(idPrefix: string): VerificationItem[] {
  return REQUIRED_PHOTO_SLOTS.map((slot) => ({
    id: `${idPrefix}-${slot.id}`,
    title: slot.label,
    description: `拍攝${slot.label}，讓拍攝主體完整入框。`,
    instruction: `請拍攝：${slot.label}`,
    type: 'photo',
    required: slot.required,
    evidence: [{ kind: 'photo', label: slot.label, required: slot.required }],
    options: slot.required
      ? undefined
      : [
          { value: 'normal', label: '已拍攝' },
          { value: 'not_applicable', label: '此車型不適用' },
        ],
  }))
}
