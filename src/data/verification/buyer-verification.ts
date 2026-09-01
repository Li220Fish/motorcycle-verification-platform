import { COLD_CHECK_OPTIONS } from './inspection-options'
import type { VerificationItem, VerificationSection } from './verification.types'

/**
 * Buyer Re-verification content — transcribed from
 * 機車交易驗證平台_賣家與買家雙流程_v2.0.html (B0–B13, 115 items). Buyer does
 * not repeat the full Seller flow — it re-checks high-risk items and
 * compares against the Seller Verification Report (see §3, §29).
 */

function item(
  partial: Partial<VerificationItem> & Pick<VerificationItem, 'id' | 'title' | 'description'>,
): VerificationItem {
  return { type: 'check', required: true, severity: 'normal', ...partial }
}

const b0: VerificationItem[] = [
  item({
    id: 'B0-01',
    title: '驗證日期里程比對',
    description: '確認驗證日期、驗證里程與目前刊登里程。',
    type: 'form',
    formFields: [
      { key: 'verificationDate', label: '車輛驗證日期', type: 'date' },
      { key: 'verificationMileage', label: '車輛驗證里程', type: 'number', unit: 'km' },
      { key: 'listingMileage', label: '目前刊登里程', type: 'number', unit: 'km' },
    ],
  }),
  item({
    id: 'B0-02',
    title: '風險項目優先閱讀',
    description: '先看未驗證、注意、事故／維修／改裝揭露項目。',
    severity: 'important',
  }),
  item({
    id: 'B0-03',
    title: '驗證證據總覽',
    description: '查看冷車啟動影片、外觀照片、電壓曲線與保養證據。',
  }),
  item({ id: 'B0-04', title: '建立複驗清單', description: '把疑點加入 Buyer Re-check List。' }),
]

const b1: VerificationItem[] = [
  item({
    id: 'B1-01',
    title: '身體狀況確認',
    description: '確認自己的身體狀況健康，能執行完整看車任務。',
  }),
  item({ id: 'B1-02', title: '任務目標確認', description: '確認自己了解這次任務／目標車款。' }),
  item({ id: 'B1-03', title: '車輛背景了解', description: '先了解車輛背景與相關知識、消息。' }),
  item({
    id: 'B1-04',
    title: '車款常識補齊',
    description: '補足目標車款常識、常見問題與已知毛病。',
  }),
  item({
    id: 'B1-05',
    title: '收購價格評估',
    description: '先設定合理收購價格，並了解日後轉手難易度。',
  }),
  item({
    id: 'B1-06',
    title: '過往紀錄掌握',
    description: '先了解車輛過往狀況，包含工單／維修紀錄等已取得資料。',
  }),
  item({ id: 'B1-07', title: '目標價位設定', description: '確認目標價位。' }),
  item({ id: 'B1-08', title: '看車地點確認', description: '確認看車地點清楚、交通與時間可行。' }),
  item({ id: 'B1-09', title: '車主本人確認', description: '確認賣家是否為車主本人。' }),
  item({
    id: 'B1-10',
    title: '安全帽攜帶',
    description: '攜帶瓜皮／3/4 安全帽；試車若戴全罩更不易忽略異音。',
  }),
  item({ id: 'B1-11', title: '刊登頁面存證', description: '保存 Marketplace／賣場頁面截圖。' }),
  item({ id: 'B1-12', title: '手套攜帶', description: '攜帶手套，方便檢查車輛。' }),
  item({ id: 'B1-13', title: '過戶文件攜帶', description: '若可能直接過戶：攜帶雙證件與印章。' }),
  item({ id: 'B1-14', title: '手機電量與權限', description: '確認手機有電量、相機與錄音權限。' }),
  item({
    id: 'B1-15',
    title: '攜帶 Voltage Probe',
    description: '若要複驗電壓，攜帶或借用 Voltage Probe。',
  }),
]

const b2: VerificationItem[] = [
  item({
    id: 'B2-01',
    title: '賣家身分一致性',
    description: '確認現場賣家與平台驗證帳號／聯絡人一致。',
    severity: 'important',
  }),
  item({
    id: 'B2-02',
    title: '車輛基本資料核對',
    description: '核對車牌、車型、顏色、里程、主要改裝。',
    severity: 'important',
    type: 'form',
    formFields: [
      { key: 'plate', label: '車牌號碼', type: 'text' },
      { key: 'model', label: '車型', type: 'text' },
      { key: 'color', label: '顏色', type: 'text' },
      { key: 'mileage', label: '現場里程', type: 'number', unit: 'km' },
      { key: 'modifications', label: '主要改裝', type: 'text', placeholder: '無則留空' },
    ],
  }),
  item({
    id: 'B2-03',
    title: '外觀照片比對',
    description: '核對現場外觀與車輛驗證照片。',
    severity: 'important',
  }),
  item({ id: 'B2-04', title: '詢問持有時間', description: '聊天：詢問這台車買多久了。' }),
  item({ id: 'B2-05', title: '詢問售車原因', description: '聊天：詢問為什麼想賣車。' }),
  item({ id: 'B2-06', title: '詢問保養習慣', description: '聊天：詢問這些年平常怎麼照顧、保養。' }),
  item({
    id: 'B2-07',
    title: '用車習慣了解',
    description:
      '聊天：了解用車習慣、常騎地點、平常保養的店家與過戶次數；若非一手車，詢問前車主資訊。',
  }),
  item({ id: 'B2-08', title: '詢問現有毛病', description: '聊天：直接詢問車子目前有沒有毛病。' }),
  item({
    id: 'B2-09',
    title: '車輛來源確認',
    description: '聊天：確認是公司車或水貨；公司車可詢問是否有原廠召回紀錄。',
  }),
  item({
    id: 'B2-10',
    title: '保養紀錄核對',
    description: '核對保養／維修紀錄與賣家描述是否一致。',
    severity: 'important',
  }),
  item({
    id: 'B2-11',
    title: '事故史詢問',
    description: '詢問是否出過車禍、撞過、滑倒或原地倒車。',
    severity: 'important',
  }),
  item({ id: 'B2-12', title: '保固紀錄詢問', description: '詢問是否有出保／保險／保固紀錄。' }),
  item({ id: 'B2-13', title: '車損照片詢問', description: '詢問是否保留當時車損照片。' }),
  item({
    id: 'B2-14',
    title: '維修車行詢問',
    description: '詢問在哪間車行維修，是否有維修工單與出保紀錄。',
  }),
  item({ id: 'B2-15', title: '修復後狀況詢問', description: '詢問修復後是否持續正常使用。' }),
  item({ id: 'B2-16', title: '其他狀況詢問', description: '詢問是否還有其他特殊狀況。' }),
  item({
    id: 'B2-17',
    title: '初步一致性確認',
    description: '若賣家回答與已掌握資料大致一致，再開始正式看車。',
  }),
  item({
    id: 'B2-18',
    title: '提早抵達觀察',
    description: '提早抵達；若非約在賣家住所，可先觀察賣家的騎行習慣與車輛動態。',
  }),
  item({ id: 'B2-19', title: '賣家言行觀察', description: '觀察賣家的習慣、穿著與談吐。' }),
  item({
    id: 'B2-20',
    title: '寒暄破冰',
    description: '聊天：詢問賣家是否等很久，先建立正常互動。',
  }),
]

const b3: VerificationItem[] = [
  item({ id: 'B3-01', title: '確認未發動', description: '先不要發動。' }),
  item({
    id: 'B3-02',
    title: '手背測溫複驗',
    description: '先用手背靠近引擎外殼／排氣附近，確認沒有明顯熱氣。',
  }),
  item({
    id: 'B3-03',
    title: '安全觸碰複驗',
    description: '確認安全後觸碰 App 指定安全位置約 5 秒；不要直接摸排氣管高溫區。',
    options: COLD_CHECK_OPTIONS,
    severity: 'important',
  }),
  item({
    id: 'B3-04',
    title: '冷車不一致標記',
    description: '若明顯已熱，標記『冷車條件不一致』並詢問原因。',
    severity: 'important',
  }),
]

const b4: VerificationItem[] = [
  item({
    id: 'B4-01',
    title: '整車照片比對',
    description: '比對左／右／前／後整車照片。',
    instruction: '拍攝左／右／前／後四個角度，與賣家報告比對',
    type: 'photo',
    evidence: [
      { kind: 'photo', label: '左側', required: true },
      { kind: 'photo', label: '右側', required: true },
      { kind: 'photo', label: '前方', required: true },
      { kind: 'photo', label: '後方', required: true },
    ],
  }),
  item({ id: 'B4-02', title: '傷痕改裝複查', description: '複查報告中的刮傷、裂痕、鏽蝕與改裝。' }),
  item({
    id: 'B4-03',
    title: '結構細節複查',
    description: '複查殼件間隙、重要螺絲、輪框、三角台與車架。',
    severity: 'important',
  }),
  item({
    id: 'B4-04',
    title: '避震複查',
    description: '複查前後避震歪斜、漏油與新擦拭痕跡。',
    severity: 'important',
  }),
  item({ id: 'B4-05', title: '差異即時紀錄', description: '現場狀態不同時立即建立差異紀錄。' }),
]

const b5: VerificationItem[] = [
  item({
    id: 'B5-01',
    title: '引擎滲漏複驗',
    description: '查看引擎底部、汽缸頭、接合處與排氣端是否滲漏。',
    severity: 'important',
  }),
  item({ id: 'B5-02', title: '機油量複驗', description: '查看機油視窗與油量狀況。' }),
  item({ id: 'B5-03', title: '消耗品複驗', description: '查看輪胎、油封、鏈條／齒盤等消耗品。' }),
  item({ id: 'B5-04', title: '新增問題紀錄', description: '把新增問題加入整理成本。' }),
]

const b6: VerificationItem[] = [
  item({ id: 'B6-01', title: '發動順暢度複驗', description: '觀察是否一觸即發，是否需要轉油門。' }),
  item({
    id: 'B6-02',
    title: '啟動異音複驗',
    description: '聽啟動馬達與怠速是否有新增異音。',
    severity: 'important',
  }),
  item({ id: 'B6-03', title: '排氣顏色複驗', description: '看排氣顏色與熱車後是否消失。' }),
  item({
    id: 'B6-04',
    title: '儀表煞車複驗',
    description: '確認油門回彈、煞車拉桿、儀表與警示燈。',
    severity: 'important',
  }),
  item({
    id: 'B6-05',
    title: '冷車發動錄影複驗',
    description: '錄製冷車啟動與怠速，和賣家紀錄對照。',
    instruction: '將手機固定好後開始錄影，發動車輛並怠速 20 秒',
    type: 'video',
    evidence: [{ kind: 'video', label: '冷車發動與怠速', required: true }],
  }),
]

const b7: VerificationItem[] = [
  item({
    id: 'B7-01',
    title: '靜置電壓複驗',
    description: '重新量 V_rest。',
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'V_rest', required: true }],
    severity: 'important',
  }),
  item({
    id: 'B7-02',
    title: '啟動電壓複驗',
    description: '重新量 V_min_start 與啟動壓降。',
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'V_min_start', required: true }],
    severity: 'critical',
  }),
  item({
    id: 'B7-03',
    title: '怠速電壓複驗',
    description: '重新量 V_idle。',
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'V_idle', required: true }],
    severity: 'important',
  }),
  item({
    id: 'B7-04',
    title: '拉轉電壓複驗',
    description: '短暫拉轉量 V_rpm。',
    type: 'voltage',
    evidence: [{ kind: 'voltage', label: 'V_rpm', required: true }],
  }),
  item({
    id: 'B7-05',
    title: '電壓數據自動比對',
    description: 'App 自動比較 Seller Verification 與 Buyer Re-verification。',
  }),
]

const b8: VerificationItem[] = [
  item({
    id: 'B8-01',
    title: '大燈複驗',
    description: '測大燈近燈／遠燈。',
    severity: 'important',
  }),
  item({ id: 'B8-02', title: '方向燈複驗', description: '測方向燈。', severity: 'important' }),
  item({ id: 'B8-03', title: '尾燈複驗', description: '測尾燈。' }),
  item({
    id: 'B8-04',
    title: '煞車燈複驗',
    description: '測煞車燈；前後煞車都要按，確認都會亮。',
    severity: 'critical',
  }),
  item({ id: 'B8-05', title: '警示燈複驗', description: '測雙黃警示燈。' }),
  item({ id: 'B8-06', title: '喇叭複驗', description: '按壓喇叭，確認聲音正常、洪亮。' }),
  item({
    id: 'B8-07',
    title: '水箱風扇複驗',
    description: '熱車後等待水溫達工作溫度，確認水箱散熱風扇會自動啟動。',
    severity: 'important',
  }),
  item({
    id: 'B8-08',
    title: '電器閃爍複驗',
    description: '觀察儀表燈號與大燈在怠速或輕轉油門時是否有異常閃爍。',
    severity: 'important',
  }),
  item({
    id: 'B8-09',
    title: '產權狀態複驗',
    description: '確認車輛沒有貸款設定／動保設定，不是權利車或流當車，才能正常過戶。',
    severity: 'critical',
  }),
  item({
    id: 'B8-10',
    title: '車籍文件複驗',
    description: '確認文件齊全：行照之外，國產車出廠證明或進口車海關完稅證明等重要文件是否保留。',
    severity: 'critical',
  }),
  item({
    id: 'B8-11',
    title: '里程佐證複驗',
    description: '確認車主手冊與保養紀錄：是否有原廠手冊、工單或保養 App 紀錄可佐證里程。',
    severity: 'important',
  }),
  item({
    id: 'B8-12',
    title: '備用鑰匙複驗',
    description: '確認備用鑰匙：是否有兩把以上；若有晶片防盜系統，確認紅鑰匙／黑鑰匙等配置。',
  }),
  item({
    id: 'B8-13',
    title: '原廠備品複驗',
    description: '確認改裝後拆下的原廠備品有保留，最好有照片可證明使用狀況，而不是事故後才更換。',
  }),
  item({
    id: 'B8-14',
    title: '車身號碼核對',
    description: '核對車身號碼／引擎號碼與文件，不應有明顯變造痕跡。',
    severity: 'critical',
  }),
]

const b9: VerificationItem[] = [
  item({
    id: 'B9-01',
    title: '試駕同意確認',
    description: '建立試駕共識，明確詢問賣家是否同意試駕。',
  }),
  item({
    id: 'B9-02',
    title: '試駕路線規劃',
    description: '先規劃試駕路線與時間，包含大道、轉彎與自己熟悉的道路。',
  }),
  item({
    id: 'B9-03',
    title: '試駕責任約定',
    description: '雙方先約定：若試駕中發生倒車、摔車，賠償方式為何；先講清楚規則避免糾紛。',
  }),
  item({
    id: 'B9-04',
    title: '試駕押品約定',
    description: '若賣家要求押身分證件或現金作為防範，雙方合意即可。',
  }),
  item({
    id: 'B9-05',
    title: '試駕前基準觀察',
    description: '試駕前先觀察一次引擎狀況，記住現況，試駕結束後再比較。',
  }),
]

const b10: VerificationItem[] = [
  item({
    id: 'B10-01',
    title: '離合器接合點複驗',
    description: '起步與離合器接合：入一檔起步，感受離合器接合點是否清晰。',
    severity: 'important',
  }),
  item({
    id: 'B10-02',
    title: '離合器打滑複驗',
    description: '加速時留意是否轉速拉高但車子沒前進，排查離合器打滑跡象。',
    severity: 'critical',
  }),
  item({
    id: 'B10-03',
    title: '換檔順暢度複驗',
    description: '在安全路段盡可能逐檔操作，確認進退檔是否順暢。',
    severity: 'important',
  }),
  item({
    id: 'B10-04',
    title: '卡檔跳檔複驗',
    description: '確認是否有卡檔、跳檔或入檔後自動跳回空檔的情況。',
    severity: 'important',
  }),
  item({
    id: 'B10-05',
    title: '高轉負荷複驗',
    description:
      '高轉速／高負荷測試只在安全與合法條件下進行；觀察車輛及引擎反應，不要在公共道路刻意危險超轉。',
  }),
  item({
    id: 'B10-06',
    title: '煞車力道複驗',
    description: '在安全速度下測試前後煞車力道。',
    severity: 'critical',
  }),
  item({
    id: 'B10-07',
    title: 'ABS複驗',
    description: '若有 ABS，在安全條件下確認 ABS 是否能正常介入。',
    severity: 'critical',
  }),
  item({
    id: 'B10-08',
    title: '拉轉異音複驗',
    description: '拉轉時留意車輛其他部位是否出現異音。',
    severity: 'important',
  }),
  item({
    id: 'B10-09',
    title: '試駕中滲油複驗',
    description: '試駕途中可安排安全地點停車，檢查較激烈操作後引擎有沒有漏油、滲油或其他異常。',
    severity: 'important',
  }),
  item({
    id: 'B10-10',
    title: '試駕動態紀錄',
    description: '試駕模式可用 GPS / IMU 記錄加速度、減速度與車身晃動，作為輔助資料。',
    type: 'ride',
    required: false,
  }),
  item({
    id: 'B10-11',
    title: '直線穩定性複驗',
    description:
      '在無車、平直且安全的道路上，僅在確保安全時稍微放鬆雙手，觀察車輛是否會嚴重偏左或偏右；若有，可能需檢查三角台或車架。',
    severity: 'critical',
  }),
  item({
    id: 'B10-12',
    title: '轉向靈活度複驗',
    description: '稍微進行左右變換車道或輕微壓彎，感受龍頭轉向是否靈活、有無阻力或卡頓。',
    severity: 'important',
  }),
  item({
    id: 'B10-13',
    title: '避震吸震複驗',
    description:
      '避免刻意衝坑洞；正常通過井蓋或路面起伏時，感受前後避震吸收震動的能力，以及是否有過度下沉到底的感覺。',
    severity: 'important',
  }),
  item({
    id: 'B10-14',
    title: '避震漏油複驗',
    description: '通過起伏後停車，檢查前後避震是否有漏油。',
  }),
]

const b11: VerificationItem[] = [
  item({
    id: 'B11-01',
    title: '熱車後滲漏複驗',
    description: '再次檢查漏油；熱車與各部件運轉過後更容易發現滲漏。',
    severity: 'critical',
  }),
  item({
    id: 'B11-02',
    title: '熱車滲漏細部複驗',
    description: '再次用手電筒檢查引擎底部、汽缸頭、前叉油封等處。',
    severity: 'important',
  }),
  item({
    id: 'B11-03',
    title: '熱車怠速穩定度複驗',
    description: '確認熱車怠速是否依舊穩定，有沒有忽高忽低或快熄火的感覺。',
    severity: 'important',
  }),
  item({
    id: 'B11-04',
    title: '試駕異常回訪',
    description: '回想試駕過程中是否有奇怪地方，例如震動過大、奇怪異音，立即向賣家詢問。',
  }),
  item({
    id: 'B11-05',
    title: '車殼緊固複驗',
    description: '檢查車殼零件與外觀是否因較激烈操作後出現掉落或鬆動。',
  }),
  item({
    id: 'B11-06',
    title: '差異項目彙整',
    description: 'App 列出 Seller Verification 與 Buyer Re-verification 不一致項目。',
  }),
  item({
    id: 'B11-07',
    title: '差異分級確認',
    description: '差異分成：可接受變化／需要詢問／建議技師複檢。',
    severity: 'important',
  }),
  item({
    id: 'B11-08',
    title: '整體合理性確認',
    description: '確認里程增量、外觀變化、冷車條件、電壓與試駕結果是否合理。',
    severity: 'important',
  }),
]

const b12: VerificationItem[] = [
  item({
    id: 'B12-01',
    title: '友善議價態度',
    description: '保持友善，不要為了殺價惡意狂嫌對方的愛車；可先稱讚車子的優點作為開場。',
  }),
  item({
    id: 'B12-02',
    title: '整理成本估算',
    description:
      '以「整理成本」作為議價依據：輪胎需換、冷車小毛病、刮傷、不合適改裝、缺乏保養等，合理換算維修成本後討論折價。',
  }),
  item({
    id: 'B12-03',
    title: '委婉求證技巧',
    description:
      '用似是而非的證據詢問，而不是直接指控；例如看到下三角台或車架摩擦痕跡，可詢問是否曾事故，要求進一步說明。',
  }),
  item({
    id: 'B12-04',
    title: '購買誠意表達',
    description: '展現購買誠意，例如說明若價格符合預算，可以當天直接過戶。',
  }),
  item({
    id: 'B12-05',
    title: '預算底線設定',
    description: '守住底線：先設定最高預算與目標價；若賣家價格太硬或車況不如預期，就離開。',
  }),
  item({
    id: 'B12-06',
    title: '理性購車提醒',
    description: '記住原指南結論：好車再找就有，不要衝動購物。',
  }),
]

const b13: VerificationItem[] = [
  item({
    id: 'B13-01',
    title: '身分文件備妥',
    description: '確認買賣雙方文件：身分證正本、第二證件（健保卡或駕照）、印章。',
  }),
  item({
    id: 'B13-02',
    title: '車輛文件備妥',
    description: '確認車輛文件：行照正本、出廠證明／海關完稅證明等，一併準備。',
  }),
  item({
    id: 'B13-03',
    title: '強制險辦理',
    description: '辦理強制險過戶／新保；過戶機車時強制險有效期限需大於 30 天。',
  }),
  item({
    id: 'B13-04',
    title: '強制險方式選擇',
    description: '可選擇由原車主將強制險過戶給你，或自行重新投保新的強制險。',
  }),
  item({
    id: 'B13-05',
    title: '驗車規定確認',
    description: '出廠超過 5 年的機車，過戶前通常需依規定驗車。',
  }),
  item({
    id: 'B13-06',
    title: '驗車合規檢查',
    description: '驗車前確認沒有違規改裝，例如排氣管防燙蓋、方向燈顏色、後照鏡等需符合法規。',
    severity: 'important',
  }),
  item({
    id: 'B13-07',
    title: '號碼變造確認',
    description: '確認引擎號碼／車身號碼沒有變造痕跡。',
    severity: 'critical',
  }),
  item({
    id: 'B13-08',
    title: '驗車不過處理',
    description: '若驗車不過，可要求賣方立即改善且不額外加價。',
  }),
  item({ id: 'B13-09', title: '陪同驗車建議', description: '驗車時建議陪同一起驗車。' }),
  item({
    id: 'B13-10',
    title: '過戶費用現金準備',
    description: '若可能當天直接過戶，準備約 3,000 元現金作為汽燃費、牌照稅、規費、驗車費等支出。',
  }),
]

export const BUYER_VERIFICATION_SECTIONS: VerificationSection[] = [
  {
    id: 'B0',
    title: '閱讀車輛驗證報告',
    shortDescription: '看車前先掌握賣家已揭露的資訊。',
    order: 0,
    items: b0,
  },
  {
    id: 'B1',
    title: '出發前準備',
    shortDescription: '確認任務、預算與隨身物品。',
    order: 1,
    items: b1,
  },
  {
    id: 'B2',
    title: '到場核對人車一致',
    shortDescription: '確認賣家身分、車輛資料與聊天核實。',
    order: 2,
    items: b2,
  },
  {
    id: 'B3',
    title: '冷車複驗',
    shortDescription: '安全 SOP 重新確認冷車狀態。',
    order: 3,
    items: b3,
  },
  {
    id: 'B4',
    title: '外觀與結構快速複驗',
    shortDescription: '比對賣家照片並複查關鍵結構。',
    order: 4,
    items: b4,
  },
  {
    id: 'B5',
    title: '引擎／漏油複驗',
    shortDescription: '複查滲漏與消耗品狀況。',
    order: 5,
    items: b5,
  },
  {
    id: 'B6',
    title: '冷車啟動複驗',
    shortDescription: '重新確認發動與怠速狀況。',
    order: 6,
    items: b6,
  },
  {
    id: 'B7',
    title: 'Voltage Probe 現場複驗',
    shortDescription: '重新量測並自動比對電壓數據。',
    order: 7,
    items: b7,
  },
  {
    id: 'B8',
    title: '電器與文件複驗',
    shortDescription: '燈具作動與產權文件複查。',
    order: 8,
    items: b8,
  },
  {
    id: 'B9',
    title: '試駕前共識',
    shortDescription: '確認試駕同意與責任約定。',
    order: 9,
    items: b9,
  },
  {
    id: 'B10',
    title: '買家試駕',
    shortDescription: '安全條件下複驗動力與車身動態。',
    order: 10,
    items: b10,
  },
  {
    id: 'B11',
    title: '試駕後／差異比對',
    shortDescription: '複查滲漏並彙整與賣家的差異。',
    order: 11,
    items: b11,
  },
  {
    id: 'B12',
    title: '議價與交易決策',
    shortDescription: '以檢查結果作為議價依據。',
    order: 12,
    items: b12,
  },
  {
    id: 'B13',
    title: '過戶',
    shortDescription: '確認文件、強制險與驗車事項。',
    order: 13,
    items: b13,
  },
]
