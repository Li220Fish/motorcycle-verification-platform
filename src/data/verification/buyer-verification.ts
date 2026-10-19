import { buildBuyerAppearanceItems } from './buyer-appearance-items'
import { LOCKED_ENGINE_SECTION_ID } from './engine-session'
import { SELLER_VERIFICATION_SECTIONS } from './seller-verification'
import type { VerificationItem, VerificationSection } from './verification.types'

/**
 * Buyer Re-verification — 3 sections (2026-10 redesign):
 *   1. 車輛外觀檢測 — the 7 animated drop-mark / steering checks
 *      (buyer-appearance-items.ts) followed by the 基本12項健檢.
 *   2. 冷車＋引擎檢查 — identical to the seller's (same item ids, imported).
 *   3. 熱車檢查 — leak re-check + hot audio/IMU session.
 *
 * Dropped for buyers: 核心照片 (seller-phase1-core), 其他主動揭露
 * (seller-phase4-disclosure) and the 上路 (RIDE-01) step. The seller flow is
 * unchanged. Answers already saved on older buyer drafts for those removed
 * items simply stop being shown — nothing reads them anymore.
 */

function item(
  partial: Partial<VerificationItem> & Pick<VerificationItem, 'id' | 'title' | 'description'>,
): VerificationItem {
  return { type: 'check', required: true, severity: 'normal', ...partial }
}

function sellerSection(id: string): VerificationSection {
  const section = SELLER_VERIFICATION_SECTIONS.find((candidate) => candidate.id === id)
  if (!section) throw new Error(`seller section ${id} missing`)
  return section
}

// --- 熱車檢查 (7, hot-engine re-checks, sequential — see lockedOrder) ---
const hotCheck: VerificationItem[] = [
  item({
    id: 'HOT-01',
    title: '引擎底部',
    description: '是否有滲漏狀況。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'HOT-02',
    title: '汽缸頭',
    description: '是否有滲漏狀況。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'HOT-03',
    title: '排氣端',
    description: '是否有滲漏狀況。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'HOT-04',
    title: '引擎運轉聲',
    description: '熱車後怠速是否有不規律金屬敲擊聲。',
    instruction: '錄音',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '熱車怠速運轉聲', required: true }],
    severity: 'critical',
    canShareCapture: true,
    helpText: '可與「油門轉動運轉聲」同步搭配。',
    lockedHint: '請先完成熱車怠速運轉聲錄音，才能繼續下一步。',
  }),
  item({
    id: 'HOT-05',
    title: '油門轉動運轉聲',
    description: '熱車後轉動油門，聽是否有異音。',
    instruction: '錄音',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '熱車轉動油門運轉聲', required: true }],
    canShareCapture: true,
    helpText: '可與「引擎運轉聲」同步搭配。',
    lockedHint: '請先完成熱車轉動油門運轉聲錄音，才能繼續下一步。',
  }),
  item({
    id: 'HOT-06',
    title: '引擎運轉穩定度',
    description: '熱車後怠速震動是否穩定。',
    instruction: '手機平放踏板／手機支架',
    type: 'motion',
    evidence: [{ kind: 'motion', label: '熱車怠速震動資料', required: true }],
    lockedHint: '請先完成震動資料收集，才能繼續下一步。',
  }),
  item({
    id: 'HOT-07',
    title: '油門轉動運轉穩定度',
    description: '熱車後轉動油門時震動是否穩定。',
    instruction: '手機平放踏板／手機支架',
    type: 'motion',
    evidence: [{ kind: 'motion', label: '熱車轉動油門震動資料', required: true }],
    lockedHint: '請先完成震動資料收集，才能繼續下一步。',
  }),
]

export const BUYER_APPEARANCE_SECTION_ID = 'buyer-appearance'

export const BUYER_VERIFICATION_SECTIONS: VerificationSection[] = [
  {
    id: BUYER_APPEARANCE_SECTION_ID,
    title: '車輛外觀檢測',
    shortDescription: '看引導動畫逐項檢查倒地與轉向痕跡，再完成基本12項健檢。',
    order: 0,
    items: [...buildBuyerAppearanceItems(), ...sellerSection('seller-phase2-basic-health').items],
  },
  { ...sellerSection(LOCKED_ENGINE_SECTION_ID), order: 1 },
  {
    id: 'buyer-hot-check',
    title: '熱車檢查',
    shortDescription: '冷車檢查完成、引擎熱車後，重新確認滲漏、運轉聲與穩定度，需依序完成。',
    order: 2,
    items: hotCheck,
    lockedOrder: true,
  },
]
