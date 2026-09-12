import { GLOBAL_INSPECTION_PROMPT } from './global-inspection-v2'
import { CORE_VISION_SIDES_V1_PROMPT } from './core-vision-sides-v1'
import { CORE_VISION_REAR_V1_PROMPT } from './core-vision-rear-v1'
import { CORE_VISION_FRONT_SUSPENSION_V1_PROMPT } from './core-vision-front-suspension-v1'
import { CORE_VISION_ENGINE_BOTTOM_V1_PROMPT } from './core-vision-engine-bottom-v1'
import { DASHBOARD_OCR_V2_PROMPT } from './dashboard-ocr-v2'
import { COLD_ENGINE_TOUCH_PROMPT } from './cold-engine-touch-v3'
import { ENGINE_AUDIO_V2_PROMPT } from './audio/engine-audio-v2'
import { REGISTRATION_OCR_PROMPT } from './registration-ocr-v1'

export interface AiPromptDefinition {
  key: string
  label: string
  defaultText: string
}

/**
 * Single source of truth for every prompt text sent to Gemini. Also the
 * catalog the admin backend's Prompt 設定 editor is built from (see
 * prompt-config.service.ts's getAiPromptCatalog / resolvePromptText) — each
 * `key` here doubles as the `aiPrompts/{key}` Firestore doc id an admin
 * override lives under. Adding a new prompt file elsewhere only becomes
 * admin-editable once it's also registered here.
 */
export const AI_PROMPT_REGISTRY: AiPromptDefinition[] = [
  {
    key: 'global-inspection-v2',
    label: '全域檢驗規則（Core Vision 共用前綴）',
    defaultText: GLOBAL_INSPECTION_PROMPT,
  },
  {
    key: 'core-vision-sides-v1',
    label: '核心影像判定（左右側外觀）',
    defaultText: CORE_VISION_SIDES_V1_PROMPT,
  },
  {
    key: 'core-vision-rear-v1',
    label: '核心影像判定（車尾外觀／對稱性）',
    defaultText: CORE_VISION_REAR_V1_PROMPT,
  },
  {
    key: 'core-vision-front-suspension-v1',
    label: '核心影像判定（前避震）',
    defaultText: CORE_VISION_FRONT_SUSPENSION_V1_PROMPT,
  },
  {
    key: 'core-vision-engine-bottom-v1',
    label: '核心影像判定（引擎底部／鏈條齒盤）',
    defaultText: CORE_VISION_ENGINE_BOTTOM_V1_PROMPT,
  },
  {
    // 2026-09：前台賣家/買家報告已經會顯示這個結果了（見
    // VerificationReportView.vue 的 latestOcrResult）。後台
    // VerifyDetailSection.vue 的 evidence-tile 還沒接，詳見
    // ocr.service.ts 的同一則備註。
    key: 'dashboard-ocr-v2',
    label: '儀表板里程 OCR',
    defaultText: DASHBOARD_OCR_V2_PROMPT,
  },
  {
    key: 'cold-engine-touch-v3',
    label: '冷車觸感檢查',
    defaultText: COLD_ENGINE_TOUCH_PROMPT,
  },
  {
    key: 'engine-audio-v2',
    label: '引擎啟動／怠速／油門音訊判定',
    defaultText: ENGINE_AUDIO_V2_PROMPT,
  },
  {
    // 已完整串接、不是半成品：VehicleRegistrationCard.vue 上傳行照照片後直接
    // 呼叫這支，結果（引擎/車身號碼或「未通過」訊息）當場顯示在畫面上，跟上面
    // 的儀表板 OCR 不同。
    key: 'registration-ocr-v1',
    label: '行照 OCR',
    defaultText: REGISTRATION_OCR_PROMPT,
  },
]

export const AI_PROMPT_MAP: ReadonlyMap<string, AiPromptDefinition> = new Map(
  AI_PROMPT_REGISTRY.map((definition) => [definition.key, definition]),
)
