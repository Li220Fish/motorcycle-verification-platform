import { SELLER_VERIFICATION_SECTIONS } from './seller-verification'
import type { VerificationItem, VerificationSection } from './verification.types'

/**
 * Buyer Re-verification content — the frozen 53-step flow (steps 1–53).
 * Fully replaces the earlier 119-item / 14-section (B0–B13) version, which
 * covered report review, arrival comparison, price negotiation, and
 * ownership transfer — none of that carries over; the spec table this was
 * built from is technical inspection only, confirmed explicitly rather than
 * assumed to still need a home elsewhere.
 *
 * Steps 1–45 are IDENTICAL to the Seller flow (same item IDs, same content —
 * imported, not duplicated) — a buyer re-verifying a vehicle re-runs the
 * exact same checklist the seller did. Steps 46–53 (上路 + 熱車檢查) only
 * exist here: the seller flow never rides the vehicle, so it has nothing to
 * hot-recheck afterward.
 */

function item(
  partial: Partial<VerificationItem> & Pick<VerificationItem, 'id' | 'title' | 'description'>,
): VerificationItem {
  return { type: 'check', required: true, severity: 'normal', ...partial }
}

// --- 上路 (1) ---
const ride: VerificationItem[] = [
  item({
    id: 'RIDE-01',
    title: '上路測試',
    description: '進行既有上路流程。',
    type: 'ride',
  }),
]

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

export const BUYER_VERIFICATION_SECTIONS: VerificationSection[] = [
  ...SELLER_VERIFICATION_SECTIONS,
  {
    id: 'buyer-ride',
    title: '上路',
    shortDescription: '進行既有上路測試流程。',
    order: 4,
    items: ride,
  },
  {
    id: 'buyer-hot-check',
    title: '熱車檢查',
    shortDescription: '上路後重新確認滲漏、運轉聲與穩定度，需依序完成。',
    order: 5,
    items: hotCheck,
    lockedOrder: true,
  },
]
