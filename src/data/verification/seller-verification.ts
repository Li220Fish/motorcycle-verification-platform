import { buildPhotoSlotItems } from './photo-slots'
import { COLD_CHECK_OPTIONS } from './inspection-options'
import type { VerificationItem, VerificationSection } from './verification.types'

/**
 * Seller Verification content — reduced flow (73 items / 5 categories),
 * replacing the earlier 152-item / 14-section version per the user's
 * explicit table. Seller has no test-ride step (that only exists on the
 * Buyer Re-verification flow, which owns its own on-site comparison).
 * Categories double as the UI's top bookmark tabs: 事前準備 / 車輛檢查 /
 * 車身外觀 / 電系狀況 / 引擎狀況.
 */

function item(
  partial: Partial<VerificationItem> & Pick<VerificationItem, 'id' | 'title' | 'description'>,
): VerificationItem {
  return { type: 'check', required: true, severity: 'normal', ...partial }
}

// --- 事前準備 (7) ---
const prep: VerificationItem[] = [
  item({
    id: 'PREP-01',
    title: '建立基本資料',
    description: '建立品牌、車型、年份、里程、車牌號碼、引擎號碼、車身號碼。',
    type: 'form',
    // 引擎號碼／車身號碼 together uniquely identify the physical vehicle —
    // both required so a verification can't be archived (completeVerification)
    // without them, and so this vehicle's future measurements reliably bind
    // back to the same vehicle (see verification.store.ts missingRequiredItems
    // and its PREP-01 -> Vehicle sync).
    formFields: [
      { key: 'brand', label: '品牌', type: 'text', required: true, placeholder: '例如 YAMAHA' },
      { key: 'model', label: '車型', type: 'text', required: true, placeholder: '例如 勁戰六代' },
      { key: 'year', label: '年份', type: 'number', required: true, unit: '年' },
      { key: 'mileage', label: '里程', type: 'number', required: true, unit: 'km' },
      { key: 'plate', label: '車牌號碼', type: 'text', required: true },
      {
        key: 'engineNumber',
        label: '引擎號碼',
        type: 'text',
        required: true,
        placeholder: '例如 G3E5-123456',
      },
      {
        key: 'chassisNumber',
        label: '車身號碼',
        type: 'text',
        required: true,
        placeholder: '例如 RH08J-098765',
      },
    ],
    evidence: [{ kind: 'photo', label: '車輛行照', required: true }],
  }),
  item({
    id: 'PREP-02',
    title: '車主身分認證',
    description: '確認賣家姓名與行照登記姓名。',
    severity: 'important',
    type: 'form',
    formFields: [
      { key: 'sellerName', label: '賣家姓名', type: 'text', required: true },
      { key: 'registrationName', label: '行照登記姓名', type: 'text', required: true },
    ],
    evidence: [{ kind: 'photo', label: '車輛行照', required: false }],
  }),
  item({
    id: 'PREP-03',
    title: '歷史工單',
    description: '確認歷史保養項目與紀錄。',
    instruction: '請拍攝保養單',
    type: 'document',
  }),
  item({
    id: 'PREP-04',
    title: '車況主動接露',
    description: '揭露：車輛罰單、倒車／滑倒、改裝、出險、碰撞與其他狀況。',
    type: 'question',
    severity: 'important',
  }),
  item({
    id: 'PREP-05',
    title: '選擇拍車位置',
    description: '確認：光線充足、可環繞拍攝、環境雜音小、無回音干擾。',
    evidence: [{ kind: 'photo', label: '拍攝環境', required: false }],
  }),
  item({
    id: 'PREP-06',
    title: '鑰匙數量',
    description: '記錄目前擁有的鑰匙數量。',
    type: 'form',
    formFields: [
      { key: 'keyCount', label: '鑰匙數量', type: 'number', unit: '把', required: true },
    ],
  }),
  item({
    id: 'PREP-07',
    title: '連接專用工具',
    description: '確定 Voltage Probe 藍芽已連接上（進階功能，非必要）。',
    required: false,
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'Probe 連接狀態', required: false }],
  }),
]

// --- 車輛檢查 (19) ---
const check: VerificationItem[] = [
  item({
    id: 'CHK-01',
    title: '烤漆確認',
    description: '是否有重新烤漆過；烤漆年份是否合理。',
    evidence: [{ kind: 'photo', label: '重新烤漆部分', required: false }],
  }),
  item({
    id: 'CHK-02',
    title: '傷痕確認',
    description: '是否有傷痕、毀損。',
    evidence: [{ kind: 'photo', label: '有傷痕部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'CHK-03',
    title: '殼件間隙',
    description: '是否車殼間隙過大。',
    evidence: [{ kind: 'photo', label: '有異常間隙部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'CHK-04',
    title: '金屬件鏽蝕',
    description: '金屬部分是否有發生鏽蝕。',
    evidence: [{ kind: 'photo', label: '有鏽蝕部分', required: false }],
  }),
  item({
    id: 'CHK-05',
    title: '金屬件噴漆',
    description: '金屬部分是否有噴漆過。',
    evidence: [{ kind: 'photo', label: '有噴漆部分', required: false }],
  }),
  item({
    id: 'CHK-06',
    title: '儀錶板',
    description: '儀表板的透光程度。',
    evidence: [{ kind: 'photo', label: '拍攝儀錶板', required: true }],
  }),
  item({
    id: 'CHK-07',
    title: '齒輪與鏈條',
    description: '齒輪是否生鏽；鏈條是否有嚴重異音。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
  }),
  item({
    id: 'CHK-08',
    title: '離合器',
    description: '離合器是否可正常作動。',
  }),
  item({
    id: 'CHK-09',
    title: '前輪胎損耗',
    description: '前輪胎的損耗程度。',
    evidence: [{ kind: 'photo', label: '拍攝前輪', required: false }],
  }),
  item({
    id: 'CHK-10',
    title: '後輪胎損耗',
    description: '後輪胎的損耗程度。',
    evidence: [{ kind: 'photo', label: '拍攝後輪', required: false }],
  }),
  item({ id: 'CHK-11', title: '輪胎平衡塊', description: '車輛輪胎是否安裝平衡塊。' }),
  item({
    id: 'CHK-12',
    title: '前避震器外觀',
    description: '避震器是否有漏油；是否有生鏽。',
    evidence: [{ kind: 'photo', label: '拍攝前避震器', required: false }],
    severity: 'important',
  }),
  item({
    id: 'CHK-13',
    title: '後避震器外觀',
    description: '避震器是否有漏油；是否有生鏽。',
    evidence: [{ kind: 'photo', label: '拍攝後避震器', required: false }],
    severity: 'important',
  }),
  item({ id: 'CHK-14', title: '機油檢查', description: '機油燈是否亮起。' }),
  item({ id: 'CHK-15', title: '水量檢查', description: '水箱水量是否充足。' }),
  item({ id: 'CHK-16', title: '引擎護蓋', description: '是否安裝引擎護蓋及其原因。' }),
  item({
    id: 'CHK-17',
    title: '坐墊外觀',
    description: '坐墊是否完整。',
    evidence: [{ kind: 'photo', label: '拍攝損壞部分', required: false }],
  }),
  item({
    id: 'CHK-18',
    title: '車架檢查',
    description: '車架是否歪斜。',
    evidence: [{ kind: 'photo', label: '拍攝車架', required: false }],
    severity: 'critical',
  }),
  item({
    id: 'CHK-19',
    title: '下三角台狀態',
    description: '是否有生鏽；止點是否存在；是否有螺絲拆裝痕跡。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'important',
  }),
]

// --- 車身外觀 (20, all mandatory-photo items) ---
const appearance: VerificationItem[] = buildPhotoSlotItems('APR')

// --- 電系狀況 (13) ---
const electric: VerificationItem[] = [
  item({ id: 'ELEC-01', title: '日光燈狀況', description: '是否可正常開啟。' }),
  item({ id: 'ELEC-02', title: '大燈狀況（近燈）', description: '是否可正常開啟。' }),
  item({ id: 'ELEC-03', title: '大燈狀況（遠燈）', description: '是否可正常開啟。' }),
  item({ id: 'ELEC-04', title: '尾燈狀況', description: '是否可正常開啟。' }),
  item({
    id: 'ELEC-05',
    title: '剎車燈狀況',
    description: '是否可正常開啟。',
    severity: 'critical',
  }),
  item({ id: 'ELEC-06', title: '左前方向燈', description: '是否可正常開啟。' }),
  item({ id: 'ELEC-07', title: '右前方向燈', description: '是否可正常開啟。' }),
  item({ id: 'ELEC-08', title: '左後方向燈', description: '是否可正常開啟。' }),
  item({ id: 'ELEC-09', title: '右後方向燈', description: '是否可正常開啟。' }),
  item({
    id: 'ELEC-10',
    title: '其他改裝品（ex:行車紀錄器）',
    description: '是否可正常開啟。',
    required: false,
  }),
  item({
    id: 'ELEC-11',
    title: '走線整齊度',
    description: '是否雜亂；是否異常扭轉；是否處處束帶。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'ELEC-12',
    title: '主線組完整性',
    description: '是否有被剪接、重燒跡象。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'critical',
  }),
  item({
    id: 'ELEC-13',
    title: '加裝電器取電點',
    description: '確認加裝電器取電點：電池直接接電／鎖頭正極／保險絲／其他。',
    evidence: [{ kind: 'photo', label: '拍攝取電位置', required: false }],
    severity: 'important',
  }),
]

// --- 引擎狀況 (14, sequential only — see lockedOrder on the section) ---
const engine: VerificationItem[] = [
  item({
    id: 'ENG-01',
    title: '引擎底部',
    description: '是否有滲漏狀況。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'ENG-02',
    title: '汽缸頭',
    description: '是否有滲漏狀況。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'ENG-03',
    title: '排氣端',
    description: '是否有滲漏狀況。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'ENG-04',
    title: '引擎拆裝痕跡',
    description: '是否有螺絲拆裝痕跡。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
    severity: 'important',
  }),
  item({
    id: 'ENG-05',
    title: '引擎噴漆痕跡',
    description: '是否有異常噴漆。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
  }),
  item({
    id: 'ENG-06',
    title: '進氣歧管外觀',
    description: '是否有螺絲拆裝痕跡。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
  }),
  item({
    id: 'ENG-07',
    title: '引擎觸感',
    description: '是否異常乾淨；是否有油泥；是否有不平整。',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
  }),
  item({
    id: 'ENG-08',
    title: '冷車檢查',
    description: '手觸碰引擎持續 5 秒：能持續接觸 5 秒／無法持續接觸 5 秒（已熱車）。',
    instruction: '固定手機位置後錄影，觸碰引擎持續 5 秒',
    type: 'video',
    options: COLD_CHECK_OPTIONS,
    evidence: [{ kind: 'video', label: '冷車觸碰 5 秒', required: true }],
    severity: 'critical',
    lockedHint: '請先完成冷車錄影，發動後將無法補拍。',
  }),
  item({
    id: 'ENG-09',
    title: '啟動馬達聲音',
    description: '錄音確認啟動馬達聲音是否正常。',
    instruction: '按下啟動時開始錄音',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '啟動馬達聲音', required: true }],
    helpText: '可與「發動順暢度」同步錄製。',
    lockedHint: '請先完成啟動錄音，熄火後將無法補錄。',
  }),
  item({
    id: 'ENG-10',
    title: '發動順暢度',
    description: '觀察發動順暢度：是否一觸即發，還是需要轉油門。',
    instruction: '發動時同步錄音',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '發動過程', required: true }],
    helpText: '可與「啟動馬達聲音」同步錄製。',
    lockedHint: '請先完成發動過程錄音，才能繼續下一步。',
  }),
  item({
    id: 'ENG-11',
    title: '引擎運轉聲',
    description: '怠速時是否有不規律金屬敲擊聲，例如鳥仔聲／氣門間隙、內鏈聲。',
    instruction: '怠速錄音 15 秒',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '怠速運轉聲', required: true }],
    severity: 'critical',
    helpText: '可與「油門轉動運轉聲」同步錄製。',
    lockedHint: '請先完成怠速運轉聲錄音，才能繼續下一步。',
  }),
  item({
    id: 'ENG-12',
    title: '油門轉動運轉聲',
    description: '適時轉動油門，聽是否有異音。',
    instruction: '轉動油門錄音 10 秒',
    type: 'audio',
    evidence: [{ kind: 'audio', label: '轉動油門運轉聲', required: true }],
    helpText: '可與「引擎運轉聲」同步錄製。',
    lockedHint: '請先完成轉動油門運轉聲錄音，才能繼續下一步。',
  }),
  item({
    id: 'ENG-13',
    title: '引擎運轉穩定度',
    description: '怠速時引擎震動是否穩定。',
    instruction: '手機平放踏板或使用手機支架',
    type: 'motion',
    evidence: [{ kind: 'motion', label: '怠速震動資料', required: true }],
    lockedHint: '請先完成震動資料收集，才能繼續下一步。',
  }),
  item({
    id: 'ENG-14',
    title: '油門轉動運轉穩定度',
    description: '轉動油門時震動是否穩定。',
    instruction: '手機平放踏板或使用手機支架',
    type: 'motion',
    evidence: [{ kind: 'motion', label: '轉動油門震動資料', required: true }],
    lockedHint: '請先完成震動資料收集，才能繼續下一步。',
  }),
]

/**
 * The 9 "does it light up" checks (ELEC-01..09) that the UX report flags as
 * 9 near-identical pages in a row — collapsed into a single quick-check
 * screen by ElectricalLightsCheck.vue. Order matters: it's what that
 * component slices into 前方(3) / 後方(2) / 方向燈(4).
 */
export const SELLER_ELECTRIC_LIGHT_ITEM_IDS = electric.slice(0, 9).map((it) => it.id)

export const SELLER_VERIFICATION_SECTIONS: VerificationSection[] = [
  {
    id: 'seller-prep',
    title: '事前準備',
    shortDescription: '建立基本資料、確認身分並備妥拍攝環境。',
    order: 0,
    items: prep,
  },
  {
    id: 'seller-check',
    title: '車輛檢查',
    shortDescription: '外觀、殼件、輪胎、避震與車架逐項檢查。',
    order: 1,
    items: check,
  },
  {
    id: 'seller-appearance',
    title: '車身外觀',
    shortDescription: '完整拍攝車輛各部位作為報告佐證。',
    order: 2,
    items: appearance,
  },
  {
    id: 'seller-electric',
    title: '電系狀況',
    shortDescription: '燈具作動、走線整齊度與取電點確認。',
    order: 3,
    items: electric,
  },
  {
    id: 'seller-engine',
    title: '引擎狀況',
    shortDescription: '冷車檢查、發動聲音與運轉穩定度，需依序完成。',
    order: 4,
    items: engine,
    lockedOrder: true,
  },
]
