import { buildPhotoSlotItems } from './photo-slots'
import { COLD_CHECK_OPTIONS } from './inspection-options'
import type { VerificationItem, VerificationSection } from './verification.types'

/**
 * Seller Verification content — transcribed from
 * 機車交易驗證平台_賣家與買家雙流程_v2.0.html (S0–S12, 124 items), the
 * highest-priority content source per V0.2 spec §1. One new section (S2b)
 * is added for the mandatory photo checklist from spec §14, which has no
 * equivalent items in the source file. See docs/verification-coverage.md
 * for the full item-by-item coverage audit against 完整看車流程.html.
 */

function item(
  partial: Partial<VerificationItem> & Pick<VerificationItem, 'id' | 'title' | 'description'>,
): VerificationItem {
  return { type: 'check', required: true, severity: 'normal', ...partial }
}

const s0: VerificationItem[] = [
  item({
    id: 'S0-01',
    title: '基本資料建檔',
    description: '建立品牌、車型、年份、里程、售價、車牌等基本資料。',
    type: 'form',
    formFields: [
      { key: 'brand', label: '品牌', type: 'text', required: true, placeholder: '例如 YAMAHA' },
      { key: 'model', label: '車型', type: 'text', required: true, placeholder: '例如 勁戰六代' },
      { key: 'year', label: '年份', type: 'number', required: true, unit: '年' },
      { key: 'mileage', label: '里程', type: 'number', required: true, unit: 'km' },
      { key: 'price', label: '售價', type: 'number', unit: '元' },
      { key: 'plate', label: '車牌號碼', type: 'text', required: true },
    ],
  }),
  item({
    id: 'S0-02',
    title: '車主身分確認',
    description: '確認賣家為車主本人；準備行照、身分與交易時可核對的文件。',
    severity: 'important',
    type: 'form',
    formFields: [
      { key: 'sellerName', label: '賣家姓名', type: 'text', required: true },
      { key: 'idLast4', label: '身分證末四碼', type: 'text', placeholder: '供核對用' },
      { key: 'phone', label: '聯絡電話', type: 'text' },
      { key: 'registrationName', label: '行照登記姓名', type: 'text' },
    ],
  }),
  item({
    id: 'S0-03',
    title: '保養文件上傳',
    description: '上傳／拍攝車主手冊、保養紀錄、維修工單與原廠備品。',
    instruction: '請拍攝或上傳相關文件',
    type: 'document',
    evidence: [{ kind: 'document', label: '保養／維修文件', required: false }],
  }),
  item({
    id: 'S0-04',
    title: '車況主動揭露',
    description: '揭露事故、倒車／滑倒、維修、改裝、出保與特殊狀況。',
    type: 'question',
    severity: 'important',
  }),
]

const s1: VerificationItem[] = [
  item({ id: 'S1-01', title: '保留冷車狀態', description: '驗證前不要先發動，保留冷車狀態。' }),
  item({ id: 'S1-02', title: '選擇拍攝位置', description: '把車停在光線充足、可繞車拍攝的位置。' }),
  item({ id: 'S1-03', title: '備妥鑰匙文件', description: '準備鑰匙、備用鑰匙、文件與維修紀錄。' }),
  item({
    id: 'S1-04',
    title: '準備 Voltage Probe',
    description: '若要做電壓驗證，準備 Voltage Probe 並連線 App。',
  }),
]

const s2: VerificationItem[] = [
  item({ id: 'S2-01', title: '原廠烤漆確認', description: '確認是否為原廠殼、原廠漆面／塗裝。' }),
  item({ id: 'S2-02', title: '烤漆年式合理性', description: '確認漆裝與年份、式樣是否合理搭配。' }),
  item({
    id: 'S2-03',
    title: '車殼外觀傷痕',
    description: '查看車身殼件／板金是否有破損、裂痕、刮痕、倒車痕跡。',
  }),
  item({
    id: 'S2-04',
    title: '殼件間隙',
    description: '查看殼件間隙是否一致，有沒有暴力拆裝痕跡。',
    severity: 'important',
  }),
  item({ id: 'S2-05', title: '車殼固定測試', description: '輕輕搖晃車殼，確認是否有斷腳或異音。' }),
  item({
    id: 'S2-06',
    title: '塑膠殼新舊度',
    description: '觀察塑膠殼狀況；若年份久但殼很新，詢問是否更換過及保養／存放方式。',
  }),
  item({ id: 'S2-07', title: '金屬件鏽蝕', description: '查看金屬件是否生鏽。' }),
  item({
    id: 'S2-08',
    title: '補漆噴塗痕跡',
    description: '查看是否有不明的鐵樂士／補漆噴塗痕跡。',
  }),
  item({ id: 'S2-09', title: '儀表燈具透光度', description: '確認儀表與燈具是否清楚、透亮。' }),
  item({
    id: 'S2-10',
    title: '車輪歪斜',
    description: '觀察車輪是否有歪斜。',
    severity: 'important',
  }),
  item({
    id: 'S2-11',
    title: '避震外觀',
    description: '確認前後避震是否歪斜、漏油或有擦拭油漬痕跡。',
    severity: 'important',
  }),
  item({
    id: 'S2-12',
    title: '副車架校準',
    description: '確認副車架是否歪斜；可從後輪中線與副車架中線是否對齊輔助觀察。',
    severity: 'critical',
  }),
  item({ id: 'S2-13', title: '掉漆情形', description: '查看車身是否有掉漆情形。' }),
  item({
    id: 'S2-14',
    title: '消耗部位磨耗',
    description: '檢查腳踏、手把、橡皮等消耗部位磨耗是否符合里程與年份。',
  }),
  item({
    id: 'S2-15',
    title: '引擎護蓋加裝原因',
    description: '若有引擎護蓋，詢問安裝原因，並確認是否有安裝前照片。',
  }),
  item({ id: 'S2-16', title: '輪框平衡塊', description: '查看輪框是否有平衡塊，數量是否異常。' }),
  item({
    id: 'S2-17',
    title: '下三角台鏽蝕',
    description: '查看下三角台是否生鏽。',
    severity: 'important',
  }),
  item({
    id: 'S2-18',
    title: '三角台止點',
    description: '確認下三角台左右止點是否仍存在。',
    severity: 'important',
  }),
  item({
    id: 'S2-19',
    title: '三角台螺絲痕跡',
    description: '查看三角台螺絲是否有拆裝痕跡、是否像原廠狀態。',
    severity: 'important',
  }),
  item({
    id: 'S2-20',
    title: '車架鏽蝕掉漆',
    description: '查看車架是否有生鏽、掉漆痕跡。',
    severity: 'critical',
  }),
]

const s2b: VerificationItem[] = buildPhotoSlotItems('S2b')

const s3: VerificationItem[] = [
  item({
    id: 'S3-01',
    title: '引擎底部滲漏',
    description: '查看引擎底部，可用衛生紙簡單確認是否有濕潤、擦拭痕跡或膠痕。',
    severity: 'important',
  }),
  item({
    id: 'S3-02',
    title: '汽缸頭滲油',
    description: '檢查汽缸頭是否滲油。',
    severity: 'important',
  }),
  item({
    id: 'S3-03',
    title: '汽缸接合滲油',
    description: '檢查汽缸與接合處是否滲油。',
    severity: 'important',
  }),
  item({ id: 'S3-04', title: '排氣端滲油積碳', description: '查看排氣端是否有滲油或異常積碳。' }),
  item({
    id: 'S3-05',
    title: '引擎拆裝痕跡',
    description: '確認引擎是否有拆裝過，螺絲是否仍像原廠狀態。',
    severity: 'important',
  }),
  item({
    id: 'S3-06',
    title: '引擎噴漆痕跡',
    description: '確認引擎是否有重新噴漆痕跡。',
    severity: 'important',
  }),
  item({
    id: 'S3-07',
    title: '進氣岐管外觀',
    description: '觀察進氣岐管外觀是否符合使用里程與年份。',
  }),
  item({
    id: 'S3-08',
    title: '引擎觸感檢查',
    description: '戴手套摸引擎底部、汽缸頭與各處，注意是否異常乾淨、油泥、油污或漆面異常。',
  }),
  item({
    id: 'S3-09',
    title: '機油視窗油量',
    description: '查看機油視窗是否清楚、乾淨，並確認機油量。',
  }),
  item({
    id: 'S3-10',
    title: '下護殼油污',
    description: '若有下整流罩／下護殼，查看內部是否有油污痕跡。',
  }),
]

const s4: VerificationItem[] = [
  item({ id: 'S4-01', title: '拆座墊檢查同意', description: '詢問賣家是否願意拆坐墊檢查電系。' }),
  item({ id: 'S4-02', title: '座墊下鏽蝕', description: '查看坐墊下副車架與車殼內部是否生鏽。' }),
  item({ id: 'S4-03', title: '走線整齊度', description: '查看走線是否雜亂、扭轉、處處束帶。' }),
  item({
    id: 'S4-04',
    title: '主線組完整性',
    description: '查看主線組是否有剪接、破線、重繞痕跡。',
    severity: 'important',
  }),
  item({ id: 'S4-05', title: '加裝電器取電點', description: '確認加裝電器取電位置。' }),
  item({
    id: 'S4-06',
    title: '取電方式合理性',
    description: '可接受的取電方式包含：電池直接接、鎖頭正極、保險絲／額外保險等合理方式。',
  }),
  item({
    id: 'S4-07',
    title: '原廠線組保留',
    description: '避免剪破原廠線組、不明取電、粗糙焊接等做法。',
    severity: 'important',
  }),
  item({
    id: 'S4-08',
    title: '改裝接頭完整性',
    description: '確認改裝燈具／電裝是否破壞原廠接頭。',
  }),
  item({
    id: 'S4-09',
    title: '電壓夾線備妥',
    description: '準備電壓夾線，但此時先不要做啟動測試。',
  }),
  item({
    id: 'S4-10',
    title: '改裝品評估順序',
    description: '改裝品放在較後面評估，不要一開始被改裝品吸引。',
  }),
  item({
    id: 'S4-11',
    title: '改裝品合法性',
    description: '確認改裝是否為合法產品；有疑慮就查詢。',
    severity: 'important',
  }),
  item({
    id: 'S4-12',
    title: '改裝品保固紀錄',
    description: '詢問改裝品使用多久，是否有保固卡、盒裝。',
  }),
  item({ id: 'S4-13', title: '原廠品保留', description: '確認拆下的原廠品是否保留。' }),
  item({
    id: 'S4-14',
    title: '原廠品照片佐證',
    description: '若在賣家家中，可查看原廠品狀況、照片，或請對方後續傳送。',
  }),
  item({
    id: 'S4-15',
    title: '改裝安裝品質',
    description: '能提升操控／動力且安裝良好的改裝才有正面價值；其餘在估價時保守看待。',
  }),
  item({ id: 'S4-16', title: '二油一水狀況', description: '確認二油一水等更換情形與目前狀況。' }),
  item({
    id: 'S4-17',
    title: '油封狀況',
    description: '查看各種油封是否硬化、龜裂、漏油。',
    severity: 'important',
  }),
  item({
    id: 'S4-18',
    title: '輪胎磨耗',
    description: '查看輪胎磨耗情形。',
    severity: 'important',
  }),
  item({ id: 'S4-19', title: '鏈條齒盤磨耗', description: '查看鏈條與齒盤磨耗情形。' }),
  item({
    id: 'S4-20',
    title: '消耗品匯總評估',
    description: '若鏈條、齒盤、輪胎已接近耗盡，但周邊鏽蝕狀況尚可，可列入議價依據。',
  }),
]

const s5: VerificationItem[] = [
  item({
    id: 'S5-01',
    title: '手背測溫',
    description: '先用手背靠近引擎外殼／排氣附近，確認沒有明顯熱氣。',
  }),
  item({
    id: 'S5-02',
    title: '安全觸碰測試',
    description: '確認安全後，依 App 指示觸碰指定安全位置約 5 秒；不要直接摸排氣管高溫區。',
    instruction: '確認安全後再觸碰指定位置',
  }),
  item({
    id: 'S5-03',
    title: '冷車溫度紀錄',
    description: '記錄：完全冷／微溫／明顯有溫度／無法安全觸碰。',
    options: COLD_CHECK_OPTIONS,
    severity: 'important',
  }),
  item({
    id: 'S5-04',
    title: '非冷車狀態標記',
    description: '若不是冷車，延後冷車驗證並在報告標記。',
  }),
]

const s6: VerificationItem[] = [
  item({
    id: 'S6-01',
    title: '發動前冷車複查',
    description: '確認是冷車；事前要求賣家不要發動，可用手輕碰排氣管確認。',
  }),
  item({
    id: 'S6-02',
    title: '發動順暢度',
    description: '觀察發動順暢度：是否一觸即發，還是需要轉油門。',
  }),
  item({
    id: 'S6-03',
    title: '啟動馬達聲音',
    description: '聽啟動馬達聲音是否正常，有沒有異音。',
    severity: 'important',
  }),
  item({
    id: 'S6-04',
    title: '排氣顏色',
    description:
      '觀察排氣顏色：剛發動若有藍煙可能吃機油；黑煙可能燃燒不完全；冷車白煙常是水氣，熱車後應消失。',
    severity: 'important',
  }),
  item({
    id: 'S6-05',
    title: '引擎異音',
    description: '聽引擎聲：怠速與輕轉油門時是否有不規律金屬敲擊聲，例如鳥仔聲／氣門間隙、內鏈聲。',
    severity: 'critical',
  }),
  item({ id: 'S6-06', title: '油門儀表連動', description: '操作油門並同步觀察儀表。' }),
  item({
    id: 'S6-07',
    title: '油門回彈',
    description: '確認油門開啟是否順暢，放開後是否能立即自動回彈到底。',
    severity: 'important',
  }),
  item({
    id: 'S6-08',
    title: '離合器拉桿',
    description: '確認離合器拉桿是否過硬、線組是否生鏽，拉放是否滑順無卡損。',
    severity: 'important',
  }),
  item({
    id: 'S6-09',
    title: '煞車拉桿回饋',
    description: '確認煞車系統：拉前煞車後是否有足夠阻力與回饋；過軟可能需檢查煞車油或是否有空氣。',
    severity: 'critical',
  }),
  item({
    id: 'S6-10',
    title: '儀表功能確認',
    description: '確認儀表板各項顯示：時速、轉速、里程、油量、水溫等是否正常。',
  }),
  item({
    id: 'S6-11',
    title: '警示燈確認',
    description: '確認是否有異常警示燈，例如引擎維修燈、ABS 故障燈。',
    severity: 'important',
  }),
  item({
    id: 'S6-12',
    title: '冷車發動錄影',
    description: '固定位置錄製冷車發動與怠速聲音／影片。',
    instruction: '將手機固定好後開始錄影，發動車輛並怠速 20 秒',
    type: 'video',
    evidence: [{ kind: 'video', label: '冷車發動與怠速', required: true }],
  }),
  item({
    id: 'S6-13',
    title: '怠速震動紀錄',
    description: '可記錄怠速期間 IMU 震動，僅作輔助比較。',
    type: 'ride',
    required: false,
  }),
]

const s7: VerificationItem[] = [
  item({
    id: 'S7-01',
    title: '靜置電壓 V_rest',
    description: '記錄靜置電壓 V_rest。',
    instruction: '連接 Probe 後記錄靜置電壓',
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'V_rest', required: true }],
    severity: 'important',
  }),
  item({
    id: 'S7-02',
    title: '啟動電壓 V_min_start',
    description: '按 Starter 時記錄最低電壓 V_min_start 與壓降。',
    instruction: '按下啟動時記錄最低電壓',
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'V_min_start', required: true }],
    severity: 'critical',
  }),
  item({
    id: 'S7-03',
    title: '怠速電壓 V_idle',
    description: '發動後記錄怠速充電電壓 V_idle。',
    instruction: '怠速穩定後記錄充電電壓',
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'V_idle', required: true }],
    severity: 'important',
  }),
  item({
    id: 'S7-04',
    title: '拉轉電壓 V_rpm',
    description: '合理短暫拉轉時記錄 V_rpm 與電壓波動。',
    instruction: '安全短暫拉轉時記錄電壓波動',
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'V_rpm', required: true }],
  }),
  item({ id: 'S7-05', title: '電壓曲線保存', description: '將完整電壓曲線與驗證時間戳綁定。' }),
]

const s8: VerificationItem[] = [
  item({
    id: 'S8-01',
    title: '大燈近遠燈',
    description: '測大燈近燈／遠燈。',
    severity: 'important',
  }),
  item({ id: 'S8-02', title: '方向燈', description: '測方向燈。', severity: 'important' }),
  item({ id: 'S8-03', title: '尾燈', description: '測尾燈。' }),
  item({
    id: 'S8-04',
    title: '煞車燈',
    description: '測煞車燈；前後煞車都要按，確認都會亮。',
    severity: 'critical',
  }),
  item({ id: 'S8-05', title: '警示燈作動', description: '測雙黃警示燈。' }),
  item({ id: 'S8-06', title: '喇叭音量', description: '按壓喇叭，確認聲音正常、洪亮。' }),
  item({
    id: 'S8-07',
    title: '水箱風扇',
    description: '熱車後等待水溫達工作溫度，確認水箱散熱風扇會自動啟動。',
    severity: 'important',
  }),
  item({
    id: 'S8-08',
    title: '電器閃爍異常',
    description: '觀察儀表燈號與大燈在怠速或輕轉油門時是否有異常閃爍。',
    severity: 'important',
  }),
]

const s9: VerificationItem[] = [
  item({
    id: 'S9-01',
    title: '產權狀態確認',
    description: '確認車輛沒有貸款設定／動保設定，不是權利車或流當車，才能正常過戶。',
    severity: 'critical',
  }),
  item({
    id: 'S9-02',
    title: '車籍文件齊全',
    description: '確認文件齊全：行照之外，國產車出廠證明或進口車海關完稅證明等重要文件是否保留。',
    severity: 'critical',
  }),
  item({
    id: 'S9-03',
    title: '里程佐證文件',
    description: '確認車主手冊與保養紀錄：是否有原廠手冊、工單或保養 App 紀錄可佐證里程。',
    severity: 'important',
  }),
  item({
    id: 'S9-04',
    title: '備用鑰匙配置',
    description: '確認備用鑰匙：是否有兩把以上；若有晶片防盜系統，確認紅鑰匙／黑鑰匙等配置。',
  }),
  item({
    id: 'S9-05',
    title: '原廠備品留存',
    description: '確認改裝後拆下的原廠備品有保留，最好有照片可證明使用狀況，而不是事故後才更換。',
  }),
  item({
    id: 'S9-06',
    title: '機油濾芯狀況',
    description: '確認機油濾芯是否生鏽、掉漆，藉此詢問存放環境與上次更換時間。',
  }),
  item({
    id: 'S9-07',
    title: '機油量變化',
    description: '比較發動前後機油視窗液面高度，確認機油量是否在規定上下限內。',
  }),
  item({
    id: 'S9-08',
    title: '機油泵浦召回紀錄',
    description: '確認機油泵浦相關召回／更換情形；前期車款曾有機油泵浦齒輪等已知問題。',
    required: false,
  }),
  item({
    id: 'S9-09',
    title: '整流器更換紀錄',
    description: '確認整流器是否有更換或預防性更換紀錄。',
    required: false,
  }),
  item({
    id: 'S9-10',
    title: '車架已知問題',
    description: '檢查車架／漆面是否有不平整、異常痕跡，注意該車系已知車架相關問題。',
    severity: 'important',
  }),
  item({
    id: 'S9-11',
    title: '三角台補修痕跡',
    description: '檢查下三角台是否有重新噴漆、補點或重新焊接跡象。',
    severity: 'important',
  }),
  item({
    id: 'S9-12',
    title: '排檔順暢度',
    description: '發動後確認空檔是否好掛，一檔到六檔是否都能順暢換檔。',
    severity: 'important',
  }),
]

const s10: VerificationItem[] = [
  item({
    id: 'S10-P1',
    title: '試駕同意確認',
    description: '建立試駕共識，明確在報告中記錄已同意試駕。',
  }),
  item({
    id: 'S10-P2',
    title: '試駕路線規劃',
    description: '先規劃試駕路線與時間，包含大道、轉彎與熟悉的道路。',
  }),
  item({
    id: 'S10-P3',
    title: '試駕責任約定',
    description: '先與買家約定：若試駕中發生倒車、摔車，賠償方式為何。',
  }),
  item({
    id: 'S10-P4',
    title: '試駕押品約定',
    description: '若買家提出押身分證件或現金，雙方合意即可。',
  }),
  item({
    id: 'S10-P5',
    title: '試駕前基準觀察',
    description: '試駕前先觀察一次引擎狀況，記住現況，試駕結束後再比較。',
  }),
  item({
    id: 'S10-01',
    title: '試駕基本操作',
    description: '在安全、合法道路完成基本起步、加速、轉向與煞車測試。',
  }),
  item({
    id: 'S10-02',
    title: '離合器接合點',
    description: '起步與離合器接合：入一檔起步，感受離合器接合點是否清晰。',
    severity: 'important',
  }),
  item({
    id: 'S10-03',
    title: '離合器打滑',
    description: '加速時留意是否轉速拉高但車子沒前進，排查離合器打滑跡象。',
    severity: 'critical',
  }),
  item({
    id: 'S10-04',
    title: '換檔順暢度',
    description: '在安全路段盡可能逐檔操作，確認進退檔是否順暢。',
    severity: 'important',
  }),
  item({
    id: 'S10-05',
    title: '卡檔跳檔',
    description: '確認是否有卡檔、跳檔或入檔後自動跳回空檔的情況。',
    severity: 'important',
  }),
  item({
    id: 'S10-06',
    title: '高轉負荷反應',
    description:
      '高轉速／高負荷測試只在安全與合法條件下進行；觀察車輛及引擎反應，不要在公共道路刻意危險超轉。',
  }),
  item({
    id: 'S10-07',
    title: '煞車力道',
    description: '在安全速度下測試前後煞車力道。',
    severity: 'critical',
  }),
  item({
    id: 'S10-08',
    title: 'ABS作動',
    description: '若有 ABS，在安全條件下確認 ABS 是否能正常介入。',
    severity: 'critical',
  }),
  item({
    id: 'S10-09',
    title: '拉轉異音',
    description: '拉轉時留意車輛其他部位是否出現異音。',
    severity: 'important',
  }),
  item({
    id: 'S10-10',
    title: '試駕中滲油複查',
    description: '試駕途中可安排安全地點停車，檢查較激烈操作後引擎有沒有漏油、滲油或其他異常。',
    severity: 'important',
  }),
  item({
    id: 'S10-11',
    title: '試駕動態紀錄',
    description: '試駕模式可用 GPS / IMU 記錄加速度、減速度與車身晃動，作為輔助資料。',
    type: 'ride',
    required: false,
    helpText:
      '若手機沒有可靠的固定架，不要用臨時磁吸方式帶著高速試駕；試駕時仍以操控手機為輔、注意安全為主。',
  }),
  item({
    id: 'S10-12',
    title: '直線穩定性',
    description:
      '在無車、平直且安全的道路上，僅在確保安全時稍微放鬆雙手，觀察車輛是否會嚴重偏左或偏右；若有，可能需檢查三角台或車架。',
    severity: 'critical',
  }),
  item({
    id: 'S10-13',
    title: '轉向靈活度',
    description: '稍微進行左右變換車道或輕微壓彎，感受龍頭轉向是否靈活、有無阻力或卡頓。',
    severity: 'important',
  }),
  item({
    id: 'S10-14',
    title: '避震吸震能力',
    description:
      '避免刻意衝坑洞；正常通過井蓋或路面起伏時，感受前後避震吸收震動的能力，以及是否有過度下沉到底的感覺。',
    severity: 'important',
  }),
  item({
    id: 'S10-15',
    title: '避震漏油複查',
    description: '通過起伏後停車，檢查前後避震是否有漏油。',
    severity: 'important',
  }),
]

const s11: VerificationItem[] = [
  item({
    id: 'S11-01',
    title: '熱車後滲漏複查',
    description: '再次檢查漏油；熱車與各部件運轉過後更容易發現滲漏。',
    severity: 'critical',
  }),
  item({
    id: 'S11-02',
    title: '熱車滲漏細部複查',
    description: '再次用手電筒檢查引擎底部、汽缸頭、前叉油封等處。',
    severity: 'important',
  }),
  item({
    id: 'S11-03',
    title: '熱車怠速穩定度',
    description: '確認熱車怠速是否依舊穩定，有沒有忽高忽低或快熄火的感覺。',
    severity: 'important',
  }),
  item({
    id: 'S11-04',
    title: '試駕異常回訪',
    description: '回想試駕過程中是否有奇怪地方，例如震動過大、奇怪異音，立即向賣家詢問。',
  }),
  item({
    id: 'S11-05',
    title: '車殼緊固複查',
    description: '檢查車殼零件與外觀是否因較激烈操作後出現掉落或鬆動。',
  }),
]

const s12: VerificationItem[] = [
  item({
    id: 'S12-01',
    title: '產生驗證檔案',
    description: '產生 Verification Profile：照片、影片、文件、歷史揭露與電壓曲線。',
  }),
  item({
    id: 'S12-02',
    title: '項目狀態標示',
    description: '每個項目標示：已驗證／賣家自述／未驗證／需要注意。',
  }),
  item({
    id: 'S12-03',
    title: '產生分享連結',
    description: '產生分享連結或 QR Code，供買家看車前閱讀。',
  }),
  item({
    id: 'S12-04',
    title: '版本與日期留存',
    description: '保留驗證日期、里程與版本，後續更新需留下紀錄。',
  }),
]

export const SELLER_VERIFICATION_SECTIONS: VerificationSection[] = [
  {
    id: 'S0',
    title: '車輛資料與身分',
    shortDescription: '建立基本資料並確認賣家身分。',
    order: 0,
    items: s0,
  },
  {
    id: 'S1',
    title: '驗證前準備',
    shortDescription: '保留冷車狀態，備妥拍攝與文件。',
    order: 1,
    items: s1,
  },
  {
    id: 'S2',
    title: '外觀與車殼',
    shortDescription: '整體一致性、殼件與車架外觀檢查。',
    order: 2,
    items: s2,
  },
  {
    id: 'S2b',
    title: '車輛照片證據',
    shortDescription: '完整拍攝車輛各部位作為報告佐證。',
    order: 3,
    items: s2b,
  },
  {
    id: 'S3',
    title: '引擎外觀／漏油',
    shortDescription: '不發動前找滲油與拆修痕跡。',
    order: 4,
    items: s3,
  },
  {
    id: 'S4',
    title: '電系、改裝、消耗品',
    shortDescription: '線路、改裝合法性與消耗品狀況。',
    order: 5,
    items: s4,
  },
  {
    id: 'S5',
    title: '冷車確認',
    shortDescription: '安全 SOP 確認車輛處於冷車狀態。',
    order: 6,
    items: s5,
  },
  {
    id: 'S6',
    title: '冷車發動與運轉',
    shortDescription: '發動、排氣、聲音與儀表確認。',
    order: 7,
    items: s6,
  },
  {
    id: 'S7',
    title: 'Voltage Probe 電壓驗證',
    shortDescription: '記錄靜置、啟動、怠速與拉轉電壓。',
    order: 8,
    items: s7,
  },
  {
    id: 'S8',
    title: '燈具與電器作動',
    shortDescription: '燈號、喇叭與散熱風扇測試。',
    order: 9,
    items: s8,
  },
  {
    id: 'S9',
    title: '文件、里程與通病',
    shortDescription: '產權文件、里程佐證與車型已知問題。',
    order: 10,
    items: s9,
  },
  {
    id: 'S10',
    title: '動態驗證／試騎',
    shortDescription: '安全條件下的動力、轉向與煞車測試。',
    order: 11,
    items: s10,
  },
  {
    id: 'S11',
    title: '熱車後再次檢查',
    shortDescription: '試駕後複查滲漏與怠速穩定度。',
    order: 12,
    items: s11,
  },
  {
    id: 'S12',
    title: '發布驗證報告',
    shortDescription: '產生可分享的完整驗證檔案。',
    order: 13,
    items: s12,
  },
]
