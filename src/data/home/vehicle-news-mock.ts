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
  category: string
  source: string
  relativeTime: string
}

export const MOCK_VEHICLE_NEWS: MockVehicleNews[] = [
  {
    id: 'news-1',
    title: '新版機車強制險費率 9 月調整，多數車主保費將小幅下降',
    category: '政策',
    source: '交通部路政司',
    relativeTime: '3 小時前',
  },
  {
    id: 'news-2',
    title: 'GOGORO 發表新款車電系統，換電效率提升 15%',
    category: '新車',
    source: '車界新知',
    relativeTime: '昨天',
  },
  {
    id: 'news-3',
    title: '雨季將至，騎士協會呼籲定期檢查輪胎胎紋深度',
    category: '安全',
    source: '騎士安全聯盟',
    relativeTime: '2 天前',
  },
]
