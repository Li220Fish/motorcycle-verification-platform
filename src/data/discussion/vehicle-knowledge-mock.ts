/**
 * 討論中心「車輛新知」— a small curated reference feed, static rather than
 * derived from live `vehicles` documents.
 *
 * This used to build its list by reading every account's `vehicles` via
 * vehicleService.listAll() and deduping by brand/model/year — that read
 * predates the v1.0 schema migration's rules tightening (vehicles are now
 * owner/admin-scoped, not readable by an arbitrary signed-in user), and
 * cross-account vehicle data (mileage, plates, chassis numbers) was never
 * something this "which models exist" reference feed actually needed in the
 * first place — it only ever used brand/model/year/photo. Rather than invent
 * a new public collection just for this already-explicitly-DEMO feature (see
 * the on-screen "目前為 DEMO 展示規格" notice), it now sources directly from
 * the same known-spec table below that used to only provide enrichment
 * content. Real per-user vehicles no longer appear here even if their model
 * isn't in this list — see docs/firestore-v1-implementation-report.md.
 */

export interface VehicleKnowledgeSpec {
  label: string
  value: string
}

export interface VehicleKnowledgeEntry {
  /** brand+model+year composite — used to dedupe identical models across owners. */
  key: string
  vehicleId: string
  brand: string
  model: string
  year: number | null
  imageUrl: string | null
  releaseInfo: string
  summary: string
  specs: VehicleKnowledgeSpec[]
}

interface KnowledgeContent {
  releaseInfo: string
  summary: string
  specs: VehicleKnowledgeSpec[]
}

function knowledgeKey(brand: string, model: string): string {
  return `${brand.trim().toUpperCase()}|${model.trim().toUpperCase()}`
}

const KNOWN_VEHICLE_CONTENT: Record<string, KnowledgeContent> = {
  [knowledgeKey('HONDA', 'PCX 160')]: {
    releaseInfo: '2021 年 11 月於台灣上市，為 PCX 系列排氣量提升後的改款車型。',
    summary:
      'HONDA PCX 160 主打舒適坐姿與大置物空間，搭載 eSP+ 引擎與怠速熄火系統，是熱門的通勤休旅速可達。',
    specs: [
      { label: '排氣量', value: '156.9 c.c.' },
      { label: '引擎型式', value: '單缸 4 行程 SOHC 4V eSP+' },
      { label: '最大馬力', value: '15.8 ps / 8,500 rpm' },
      { label: '最大扭力', value: '14.7 N‧m / 6,500 rpm' },
      { label: '油箱容量', value: '8.1 L' },
      { label: '車重', value: '131 kg' },
    ],
  },
  [knowledgeKey('SYM', 'JET 14 125')]: {
    releaseInfo: '2018 年首度上市，之後持續推出年式小改款，調整車色與配備。',
    summary: 'SYM JET 14 125 定位為運動速可達，車身輕巧、操控靈活，是市區通勤的熱門選擇之一。',
    specs: [
      { label: '排氣量', value: '124.8 c.c.' },
      { label: '引擎型式', value: '單缸 4 行程 SOHC 4V RS9 Blue Core' },
      { label: '最大馬力', value: '10.75 ps / 8,000 rpm' },
      { label: '最大扭力', value: '10.0 N‧m / 6,000 rpm' },
      { label: '油箱容量', value: '4.7 L' },
      { label: '車重', value: '100 kg' },
    ],
  },
  [knowledgeKey('GOGORO', '1 Plus')]: {
    releaseInfo: '2018 年上市，為 GOGORO 1 系列的性能強化版本，採用第二代動力系統。',
    summary:
      'GOGORO 1 Plus 是智慧電動機車的代表車款之一，透過 GoStation 換電站快速補充電力，免去傳統充電等待時間。',
    specs: [
      { label: '馬達型式', value: '中置直驅永磁同步馬達' },
      { label: '最大馬力', value: '7.6 ps（5.6 kW）' },
      { label: '最大扭力', value: '22.6 N‧m' },
      { label: '電池', value: 'Gogoro 智慧電池 x2（可換電）' },
      { label: '續航力', value: '約 85 km（一般騎乘模式）' },
      { label: '車重', value: '92 kg' },
    ],
  },
  [knowledgeKey('KAWASAKI', 'Z900')]: {
    releaseInfo: '2017 年全球發表，為 Z 系列街車的中量級旗艦，之後歷年式微調懸吊與電控設定。',
    summary: 'KAWASAKI Z900 以直列四缸引擎與運動化車架著稱，是中大型重機街車市場的熱門選擇。',
    specs: [
      { label: '排氣量', value: '948 c.c.' },
      { label: '引擎型式', value: '直列 4 缸 4 行程 DOHC 16V' },
      { label: '最大馬力', value: '125 ps / 9,500 rpm' },
      { label: '最大扭力', value: '98.6 N‧m / 7,700 rpm' },
      { label: '油箱容量', value: '17 L' },
      { label: '車重', value: '212 kg（含油）' },
    ],
  },
  [knowledgeKey('KYMCO', 'Agility 125')]: {
    releaseInfo: '長銷經典速可達車系，Agility 系列自推出以來持續改款，主打親民售價與低油耗。',
    summary:
      'KYMCO Agility 125 是台灣街頭常見的入門速可達，車身輕巧、座墊平坦，適合新手與代步族群。',
    specs: [
      { label: '排氣量', value: '124.7 c.c.' },
      { label: '引擎型式', value: '單缸 4 行程 SOHC 2V' },
      { label: '最大馬力', value: '9.4 ps / 7,500 rpm' },
      { label: '最大扭力', value: '9.8 N‧m / 6,000 rpm' },
      { label: '油箱容量', value: '5.5 L' },
      { label: '車重', value: '98 kg' },
    ],
  },
}

interface KnownVehicle {
  brand: string
  model: string
  year: number
  imageUrl: string
}

// Same 5 models + photos + release years as scripts/seed-mock-vehicles.mjs's
// demo fleet, kept in sync deliberately — one shared reference set instead
// of two independently-drifting lists of "the demo motorcycles."
const KNOWN_VEHICLES: KnownVehicle[] = [
  {
    brand: 'HONDA',
    model: 'PCX 160',
    year: 2022,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/2021_Honda_PCX_160_Standard.jpg/960px-2021_Honda_PCX_160_Standard.jpg',
  },
  {
    brand: 'SYM',
    model: 'JET 14 125',
    year: 2021,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Sym_jet_4_rear_front.jpg/960px-Sym_jet_4_rear_front.jpg',
  },
  {
    brand: 'GOGORO',
    model: '1 Plus',
    year: 2020,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Gogoro_1_Plus_Blue.jpg/960px-Gogoro_1_Plus_Blue.jpg',
  },
  {
    brand: 'KAWASAKI',
    model: 'Z900',
    year: 2019,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/KawasakiZ900.jpg/960px-KawasakiZ900.jpg',
  },
  {
    brand: 'KYMCO',
    model: 'Agility 125',
    year: 2020,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Kymco_Agility_50_2T_R16%2B.jpg/960px-Kymco_Agility_50_2T_R16%2B.jpg',
  },
]

export function listVehicleKnowledgeEntries(): VehicleKnowledgeEntry[] {
  return KNOWN_VEHICLES.map((vehicle) => {
    const content = KNOWN_VEHICLE_CONTENT[knowledgeKey(vehicle.brand, vehicle.model)]
    return {
      key: `${vehicle.brand}|${vehicle.model}|${vehicle.year}`,
      vehicleId: knowledgeKey(vehicle.brand, vehicle.model),
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      imageUrl: vehicle.imageUrl,
      releaseInfo: content?.releaseInfo ?? '',
      summary: content?.summary ?? '',
      specs: content?.specs ?? [],
    }
  })
}
