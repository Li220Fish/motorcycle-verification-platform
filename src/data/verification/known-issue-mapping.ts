import type {
  VehicleModelKnownIssue,
  VehicleModelKnownIssuePart,
} from '@/services/firebase/vehicle-model.service'

/**
 * 通病資料（vehicleModels/{id}.knownIssues）只分 5 大身體部位（admin
 * ModelsSection.vue 的通病編輯器），本身沒有對到買家會實際逐項檢查的
 * item id／key。這裡把 5 大類配置到真正會被買家點開的項目，讓
 * CorePhotoCaptureFlow.vue／BasicHealthCheck13.vue 能在買家檢查到對應部位
 * 的當下跳出提醒——而不是只靜靜躺在 BuyerDisclosureCheck.vue 那個最後才看
 * 到的總覽畫面裡。
 *
 * APR_ITEM_IDS 直接沿用 ai-vision-items.ts 既有的 Core Vision 身體部位分組
 * （aprItemIds）——同一套「左右側／車尾／前避震／引擎底部」語意已經在那邊是
 * 權威來源，這裡不重新發明一套。BASIC_HEALTH_CHECK_KEYS 則是依項目名稱常識
 * 配置（寧可少配也不要配錯），非嚴格 1:1，可依實測調整。
 */
export const KNOWN_ISSUE_PART_LABEL: Record<VehicleModelKnownIssuePart, string> = {
  sides: '左右側外觀',
  rear: '車尾',
  front_suspension: '前避震',
  engine_bottom: '引擎底部／傳動',
  general: '其他',
}

export const KNOWN_ISSUE_PART_APR_ITEM_IDS: Record<VehicleModelKnownIssuePart, string[]> = {
  sides: ['APR-left-side', 'APR-right-side'],
  rear: ['APR-rear'],
  front_suspension: ['APR-front-suspension-left', 'APR-front-suspension-right'],
  engine_bottom: ['APR-engine-bottom', 'APR-transmission-chain'],
  general: [],
}

/** 前避震→前避震本身＋三角台（同一支結構）；引擎底部/傳動→鏈條；車尾→尾燈
 *  （車尾外觀的一部分）。左右側外觀跟「其他」在基本12項裡沒有單獨對應的細
 *  項，就不配——仍然會在 BuyerDisclosureCheck.vue 的總覽畫面看到。 */
export const KNOWN_ISSUE_PART_BASIC_HEALTH_CHECK_KEYS: Record<
  VehicleModelKnownIssuePart,
  string[]
> = {
  sides: [],
  rear: ['taillight'],
  front_suspension: ['frontshock', 'triple'],
  engine_bottom: ['chain'],
  general: [],
}

function issuesMatchingKey(
  issues: VehicleModelKnownIssue[] | undefined,
  mapping: Record<VehicleModelKnownIssuePart, string[]>,
  key: string,
): VehicleModelKnownIssue[] {
  if (!issues || issues.length === 0) return []
  return issues.filter((issue) => mapping[issue.part]?.includes(key))
}

export function knownIssuesForAprItem(
  issues: VehicleModelKnownIssue[] | undefined,
  aprItemId: string,
): VehicleModelKnownIssue[] {
  return issuesMatchingKey(issues, KNOWN_ISSUE_PART_APR_ITEM_IDS, aprItemId)
}

export function knownIssuesForBasicHealthCheckKey(
  issues: VehicleModelKnownIssue[] | undefined,
  key: string,
): VehicleModelKnownIssue[] {
  return issuesMatchingKey(issues, KNOWN_ISSUE_PART_BASIC_HEALTH_CHECK_KEYS, key)
}
