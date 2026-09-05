/**
 * DEMO "車訊新知" content feed — no CMS/API content source exists yet.
 * Mirrors the mock-data pattern already used for marketplace-mock.ts. Read
 * live from Firestore's `vehicleNews` collection via homeContentService;
 * kept here as the authored reference content
 * scripts/seed-marketplace-mock.mjs mirrors.
 */
export interface MockVehicleNews {
  id: string
  title: string
  summary?: string
  category: string
  coverImageUrl?: string | null
  sourceName: string
  sourceUrl?: string | null
  content: string
  publishedAt: number
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const MOCK_VEHICLE_NEWS: MockVehicleNews[] = [
  {
    id: 'news-1',
    title: '新版機車強制險費率 9 月調整，多數車主保費將小幅下降',
    summary: '交通部路政司公告新版強制險費率，多數 150 c.c. 以下車款保費小幅下降。',
    category: '政策',
    sourceName: '交通部路政司',
    publishedAt: Date.now() - 3 * HOUR,
    content:
      '交通部路政司今日公告，新版機車強制汽車責任保險費率將自 9 月 1 日起調整，依車輛排氣量級距與肇事率統計重新試算，多數 150 c.c. 以下速可達與檔車的保費將小幅下降，250 c.c. 以上重型機車則因肇事理賠金額上升，費率維持不變或小幅上升。\n\n路政司表示，強制險費率每年會依前一年度的理賠經驗值檢討，此次調整主要反映近年速可達事故理賠件數下降的趨勢。車主續保時系統將自動套用新費率，不需要另外申請，實際金額仍會依車輛的排氣量、使用地區與過去理賠紀錄而有所不同。\n\n監理站也提醒車主，強制險僅涵蓋對方人身傷害的基本保障，若要涵蓋自身車損或第三方財損，仍需另外投保第三人責任險或車體險。',
  },
  {
    id: 'news-2',
    title: 'GOGORO 發表新款車電系統，換電效率提升 15%',
    summary: 'GOGORO 新一代車電系統換電效率提升 15%，優先於雙北、台中部署。',
    category: '新車',
    sourceName: '車界新知',
    publishedAt: Date.now() - 1 * DAY,
    content:
      'GOGORO 昨日發表新一代車電系統，透過重新設計的電池艙與充電迴路，換電站單次換電效率較前代提升約 15%，尖峰時段排隊等待時間可望明顯縮短。新系統預計優先於雙北、台中等 GoStation 密度較高的都會區部署，其餘縣市則採分階段更新。\n\n除了換電效率，這套系統也同步優化了電池健康度回報機制，車主可在 App 上看到更精細的電池耗損分析，協助判斷是否需要更換車輛的核心動力模組。GOGORO 表示，既有車款可透過原廠回廠更新部分軟體功能，但換電速度提升主要仰賴 GoStation 端的硬體汰換，車主端不需額外付費升級。\n\n業界人士觀察，這次更新是 GOGORO 因應競爭對手電動速可達陸續推出快充方案的回應，換電模式的核心優勢在於「不用等待」，效率提升有助鞏固既有車主的黏著度。',
  },
  {
    id: 'news-3',
    title: '雨季將至，騎士協會呼籲定期檢查輪胎胎紋深度',
    summary: '騎士安全聯盟提醒雨季前檢查胎紋深度與胎壓，降低打滑風險。',
    category: '安全',
    sourceName: '騎士安全聯盟',
    publishedAt: Date.now() - 2 * DAY,
    content:
      '隨著雨季即將到來，騎士安全聯盟提醒所有機車騎士，濕滑路面是機車事故的高風險因素之一，其中輪胎胎紋深度不足是最容易被忽略、卻也最直接影響煞車與過彎安全的項目。聯盟建議車主養成每月自行檢查一次胎紋的習慣，可用十元硬幣邊緣卡入胎紋溝槽，若硬幣邊緣的文字完全露出，代表胎紋已經磨損到需要更換的程度。\n\n除了胎紋深度，胎壓不足或過高同樣會影響雨天抓地力與煞車距離，建議依原廠標示的胎壓值定期檢查，並避免長時間曝曬或超載騎乘加速輪胎老化。聯盟也呼籲，輪胎即使胎紋充足，若已使用超過 3 至 5 年，橡膠本身也會因為老化而變硬、抓地力下降，仍應請專業技師評估是否更換。\n\n此外，雨天騎乘應主動放慢車速、避開路面標線與人孔蓋等濕滑處，並保持與前車的安全距離，以降低打滑風險。',
  },
]
