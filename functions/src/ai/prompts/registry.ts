import { GLOBAL_INSPECTION_PROMPT } from './global-inspection-v2'
import { CORE_VISION_V2_PROMPT } from './core-vision-v2'
import { DASHBOARD_OCR_V2_PROMPT } from './dashboard-ocr-v2'
import { COLD_ENGINE_TOUCH_PROMPT } from './cold-engine-touch-v3'
import { ENGINE_AUDIO_V2_PROMPT } from './audio/engine-audio-v2'
import { RETRY_BASE_PROMPT } from './retry-base-v1'
import { REGISTRATION_OCR_PROMPT } from './registration-ocr-v1'
import {
  BODY_DAMAGE_RETRY_PROMPT,
  PAINT_CONDITION_RETRY_PROMPT,
  BODY_ALIGNMENT_RETRY_PROMPT,
  FRONT_SUSPENSION_RETRY_PROMPT,
  ENGINE_BOTTOM_LEAK_RETRY_PROMPT,
  ENGINE_BOTTOM_EXTERNAL_RETRY_PROMPT,
  CHAIN_SPROCKET_RETRY_PROMPT,
} from './retry/core-vision-v2-retry'

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
    key: 'core-vision-v2',
    label: '核心影像判定（外觀／前避震／引擎底部／鏈條齒盤）',
    defaultText: CORE_VISION_V2_PROMPT,
  },
  {
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
    key: 'retry-base-v1',
    label: '核心影像重試共用前綴',
    defaultText: RETRY_BASE_PROMPT,
  },
  {
    key: 'core-vision-v2-retry-body_damage',
    label: '重試：外觀損傷',
    defaultText: BODY_DAMAGE_RETRY_PROMPT,
  },
  {
    key: 'core-vision-v2-retry-paint_condition',
    label: '重試：烤漆狀況',
    defaultText: PAINT_CONDITION_RETRY_PROMPT,
  },
  {
    key: 'core-vision-v2-retry-body_alignment_visual',
    label: '重試：外觀對正',
    defaultText: BODY_ALIGNMENT_RETRY_PROMPT,
  },
  {
    key: 'core-vision-v2-retry-front_suspension_condition',
    label: '重試：前避震狀況',
    defaultText: FRONT_SUSPENSION_RETRY_PROMPT,
  },
  {
    key: 'core-vision-v2-retry-engine_bottom_leak_condition',
    label: '重試：引擎底部漏油',
    defaultText: ENGINE_BOTTOM_LEAK_RETRY_PROMPT,
  },
  {
    key: 'core-vision-v2-retry-engine_bottom_external_condition',
    label: '重試：引擎底部外觀',
    defaultText: ENGINE_BOTTOM_EXTERNAL_RETRY_PROMPT,
  },
  {
    key: 'core-vision-v2-retry-chain_sprocket_condition',
    label: '重試：鏈條齒盤',
    defaultText: CHAIN_SPROCKET_RETRY_PROMPT,
  },
  {
    key: 'registration-ocr-v1',
    label: '行照 OCR',
    defaultText: REGISTRATION_OCR_PROMPT,
  },
]

export const AI_PROMPT_MAP: ReadonlyMap<string, AiPromptDefinition> = new Map(
  AI_PROMPT_REGISTRY.map((definition) => [definition.key, definition]),
)
