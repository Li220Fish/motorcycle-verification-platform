import { buildPhotoSlotItems } from './photo-slots'
import type { VerificationItem, VerificationSection } from './verification.types'

/**
 * Seller Verification content — Verification v2 (see MotoVerify Verification
 * v2 Migration spec). Supersedes the earlier frozen 45-step / 4-category
 * (事前準備/車身外觀/電系狀況/引擎狀況) flow: item ids are UNCHANGED (they are
 * this app's stable business keys, never the old step numbers — see RULE 0),
 * but the flow is regrouped into 5 user-facing PHASEs, 8 low-value steps are
 * removed outright (車牌/前輪/後輪/引擎左側/引擎右側/排氣管/車身號碼, plus the
 * already-nonexistent "選擇拍車位置"), and 5 items become Optional
 * self-disclosure (see photo-slots.ts) plus ENG-01 (引擎觸感, spec item 38).
 *
 * PREP-03 (驗車環境檢測) has been removed entirely per user instruction — it
 * predated the numbered 1–45 item table as calibration infrastructure and is
 * no longer part of the product at all (not just downgraded to Optional).
 * Removed the same way as the other 7 deleted steps: gone from the item
 * array, not merely hidden.
 *
 * 引擎狀況 here only covers the COLD-engine checks — the matching post-ride
 * 熱車檢查 (hot-engine re-checks) only exists on the Buyer flow (see
 * buyer-verification.ts), which the v2 migration spec does not mention at
 * all and is left untouched.
 */

function item(
  partial: Partial<VerificationItem> & Pick<VerificationItem, 'id' | 'title' | 'description'>,
): VerificationItem {
  return { type: 'check', required: true, severity: 'normal', ...partial }
}

// --- 事前準備 (3) ---
const prep: VerificationItem[] = [
  item({
    id: 'PREP-01',
    title: '歷史工單',
    description: '確認歷史保養項目。車主提供之補充資訊，非 AI 核心判定項目。',
    instruction: '請拍攝或上傳保養單',
    type: 'document',
    required: false,
    evidence: [{ kind: 'document', label: '保養單', required: true }],
    aiCheck: 'document',
  }),
  item({
    id: 'PREP-02',
    title: '車況主動揭露',
    description:
      '請車主主動揭露車輛是否曾有以下狀況（可複選）。車主提供之補充資訊，非 AI 核心判定項目。',
    type: 'question',
    required: false,
    severity: 'important',
    disclosureOptions: [
      { value: 'rollover', label: '倒車' },
      { value: 'collision', label: '碰撞' },
      { value: 'other', label: '其他' },
      { value: 'none', label: '無' },
    ],
    helpText: 'User 主動揭露 — 由車主自行複選是否有以上任一狀況並補充說明。',
  }),
  item({
    id: 'PREP-02-DAMAGE-PHOTOS',
    title: '其他車損照片',
    description:
      '請拍攝碰撞或其他車況所在位置的照片，可拍攝多張。車主提供之補充資訊，非 AI 核心判定項目。',
    type: 'photo',
    required: false,
    severity: 'important',
    multiPhoto: true,
    visibleWhen: { itemId: 'PREP-02', anyOfSelections: ['collision', 'other'] },
    helpText: 'User 主動揭露 — 針對 PREP-02 勾選的狀況，補充拍攝實際位置的照片。',
  }),
  item({
    id: 'PREP-04',
    title: '連接專用工具',
    description: '確定 Voltage Probe 藍芽已連接（進階功能，非必要）。',
    required: false,
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'Probe 連接狀態', required: false }],
    helpText: '若本次驗證需要 Probe／專用硬體。',
  }),
]

// --- 車身外觀 (20, all mandatory-photo items) ---
const appearance: VerificationItem[] = buildPhotoSlotItems('APR')

// --- 電系狀況 (13) ---
const electric: VerificationItem[] = [
  item({
    id: 'ELEC-01',
    title: '日行燈狀況',
    description: '是否可正常開啟。',
    helpText: '人工操作確認。',
  }),
  item({
    id: 'ELEC-02',
    title: '大燈狀況（近燈）',
    description: '是否可正常開啟。',
    helpText: '人工操作確認。',
  }),
  item({
    id: 'ELEC-03',
    title: '大燈狀況（遠燈）',
    description: '是否可正常開啟。',
    helpText: '人工操作確認。',
  }),
  item({
    id: 'ELEC-04',
    title: '尾燈狀況',
    description: '是否可正常開啟。',
    helpText: '人工操作確認。',
  }),
  item({
    id: 'ELEC-05',
    title: '煞車燈狀況',
    description: '是否可正常開啟。',
    severity: 'critical',
    helpText: '人工操作確認。',
  }),
  item({
    id: 'ELEC-06',
    title: '左前方向燈',
    description: '是否可正常開啟。',
    helpText: '人工操作確認。',
  }),
  item({
    id: 'ELEC-07',
    title: '右前方向燈',
    description: '是否可正常開啟。',
    helpText: '人工操作確認。',
  }),
  item({
    id: 'ELEC-08',
    title: '左後方向燈',
    description: '是否可正常開啟。',
    helpText: '人工操作確認。',
  }),
  item({
    id: 'ELEC-09',
    title: '右後方向燈',
    description: '是否可正常開啟。',
    helpText: '人工操作確認。',
  }),
  item({
    id: 'ELEC-10',
    title: '電系是否有改裝',
    description: '確認車輛電系是否曾加裝或改裝電器用品。車主提供之補充資訊，非 AI 核心判定項目。',
    required: false,
    severity: 'important',
    options: [
      { value: 'normal', label: '沒有' },
      { value: 'attention', label: '有' },
      { value: 'unsure', label: '不確定' },
    ],
    // 沒有 -> skip straight to 引擎狀況 (ELEC-11..13 auto-marked not_applicable);
    // 有／不確定 -> ELEC-11 is next in document order regardless, no branch needed.
    branch: [{ value: 'normal', skipToItemId: 'ENG-01' }],
  }),
  item({
    id: 'ELEC-11',
    title: '走線整齊度',
    description:
      '是否雜亂；是否異常扭轉；是否大量束帶或異常固定。車主提供之補充資訊，非 AI 核心判定項目。',
    required: false,
    evidence: [{ kind: 'photo', label: '拍攝異常線路', required: false }],
    severity: 'important',
    helpText: '條件式：上一題回答「有」或「不確定」才需要填寫。',
  }),
  item({
    id: 'ELEC-12',
    title: '主線組完整性',
    description: '是否有剪接、燒焦、重新包覆等異常痕跡。車主提供之補充資訊，非 AI 核心判定項目。',
    required: false,
    evidence: [{ kind: 'photo', label: '拍攝主線組', required: false }],
    severity: 'critical',
    helpText: '條件式：上一題回答「有」或「不確定」才需要填寫。',
  }),
  item({
    id: 'ELEC-13',
    title: '加裝電器取電點',
    description:
      '確認加裝電器取電點：1、電池直接接電 2、鎖頭正極 3、保險絲 4、其他。車主提供之補充資訊，非 AI 核心判定項目。',
    required: false,
    evidence: [{ kind: 'photo', label: '拍攝取電位置', required: false }],
    severity: 'important',
    helpText: '條件式：上一題回答「有」或「不確定」才需要填寫。',
  }),
]

// --- 引擎狀況 (8, cold-engine only, sequential — see lockedOrder) ---
const engine: VerificationItem[] = [
  item({
    id: 'ENG-01',
    title: '引擎觸感',
    description: '是否異常乾淨；是否有油泥；是否有不平整。車主提供之補充資訊，非 AI 核心判定項目。',
    required: false,
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
  }),
  item({
    id: 'ENG-02',
    title: '冷車狀態確認',
    description:
      '系統計時觸碰引擎外部參考位置持續 5 秒，確認本次是否符合冷車採集條件（AI 判定，非車主自行回報溫度感受）。',
    instruction: '對準引擎外部參考位置，依系統倒數觸碰滿 5 秒',
    type: 'cold-touch',
    evidence: [{ kind: 'video', label: '冷車觸碰 5 秒', required: true }],
    severity: 'critical',
    lockedHint: '請先完成冷車狀態確認，發動後將無法補做。',
  }),
  item({
    id: 'ENG-03',
    title: '啟動馬達聲音',
    description: '錄音確認啟動馬達聲音是否正常。',
    instruction: '按下啟動時開始錄音',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '啟動馬達聲音', required: true }],
    canShareCapture: true,
    helpText: '可與「發動順暢度」同步錄製。',
    lockedHint: '請先完成啟動錄音，熄火後將無法補錄。',
  }),
  item({
    id: 'ENG-04',
    title: '發動順暢度',
    description: '觀察發動順暢度：是否一觸即發，還是需要轉油門。',
    instruction: '發動時同步錄音',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '發動過程', required: true }],
    canShareCapture: true,
    helpText: '可與「啟動馬達聲音」同步錄製。',
    lockedHint: '請先完成發動過程錄音，才能繼續下一步。',
  }),
  item({
    id: 'ENG-05',
    title: '引擎運轉聲',
    description: '怠速時是否有不規律金屬敲擊聲，例如鳥仔聲／氣門間隙、內鏈聲。',
    instruction: '怠速錄音 15 秒',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '怠速運轉聲', required: true }],
    severity: 'critical',
    canShareCapture: true,
    helpText: '可與「油門轉動運轉聲」同步錄製。',
    lockedHint: '請先完成怠速運轉聲錄音，才能繼續下一步。',
  }),
  item({
    id: 'ENG-06',
    title: '油門轉動運轉聲',
    description: '適時轉動油門，聽是否有異音。',
    instruction: '轉動油門錄音 10 秒',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '轉動油門運轉聲', required: true }],
    canShareCapture: true,
    helpText: '可與「引擎運轉聲」同步錄製。',
    lockedHint: '請先完成轉動油門運轉聲錄音，才能繼續下一步。',
  }),
  item({
    id: 'ENG-07',
    title: '引擎運轉穩定度',
    description: '怠速時引擎震動是否穩定。',
    instruction: '手機平放踏板或使用手機支架',
    type: 'motion',
    evidence: [{ kind: 'motion', label: '怠速震動資料', required: true }],
    lockedHint: '請先完成震動資料收集，才能繼續下一步。',
  }),
  item({
    id: 'ENG-08',
    title: '油門轉動運轉穩定度',
    description: '轉動油門時震動是否穩定。',
    instruction: '手機平放踏板或使用手機支架',
    type: 'motion',
    evidence: [{ kind: 'motion', label: '轉動油門震動資料', required: true }],
    lockedHint: '請先完成震動資料收集，才能繼續下一步。',
  }),
]

/**
 * The 9 "does it light up" checks (ELEC-01..09) collapsed into a single
 * quick-check screen by ElectricalLightsCheck.vue. Order matters: it's what
 * that component slices into 前方(3) / 後方(2) / 方向燈(4).
 */
export const SELLER_ELECTRIC_LIGHT_ITEM_IDS = electric.slice(0, 9).map((it) => it.id)

// Verification v2's 5-Phase user-facing regrouping (spec §8) — pure
// presentation/ordering, no item id is invented or renamed here. Steps 1/2/4
// and the 5 now-optional photo slots + ENG-01 collapse into one PHASE 4
// (其他主動揭露).
const CORE_PHOTO_SLOT_IDS = new Set([
  'APR-left-side',
  'APR-right-side',
  'APR-dashboard',
  'APR-rear',
  'APR-front-suspension',
  'APR-engine-bottom',
  'APR-transmission-chain',
])
const corePhotos = appearance.filter((it) => CORE_PHOTO_SLOT_IDS.has(it.id))
const optionalPhotos = appearance.filter((it) => !CORE_PHOTO_SLOT_IDS.has(it.id))
const coldAndEngineSensorItems = engine.filter((it) => it.id !== 'ENG-01')
const engineDisclosure = engine.filter((it) => it.id === 'ENG-01')

export const SELLER_VERIFICATION_SECTIONS: VerificationSection[] = [
  {
    id: 'seller-phase1-core',
    title: '核心照片',
    shortDescription: '車輛關鍵部位拍攝，AI 會自動分析。',
    order: 0,
    items: corePhotos,
  },
  {
    id: 'seller-phase2-electric',
    title: '燈光電系',
    shortDescription: '逐一確認燈具作動狀況。',
    order: 1,
    items: electric.slice(0, 9),
  },
  {
    id: 'seller-phase3-engine',
    title: '冷車＋引擎檢查',
    shortDescription: '冷車狀態確認、單次 23 秒發動＋怠速＋油門檢測，需依序完成。',
    order: 2,
    items: coldAndEngineSensorItems,
    lockedOrder: true,
  },
  {
    id: 'seller-phase4-disclosure',
    title: '其他主動揭露',
    shortDescription: '車主自行提供的補充資訊，非 AI 核心判定，可全部略過。',
    order: 3,
    items: [...prep, ...optionalPhotos, ...electric.slice(9), ...engineDisclosure],
  },
]
