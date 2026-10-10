import { GLOBAL_INSPECTION_PROMPT } from './global-inspection-v2'
import { CORE_VISION_SIDES_V1_PROMPT } from './core-vision-sides-v1'
import { CORE_VISION_REAR_V1_PROMPT } from './core-vision-rear-v1'
import { CORE_VISION_FRONT_SUSPENSION_V1_PROMPT } from './core-vision-front-suspension-v1'
import { CORE_VISION_ENGINE_BOTTOM_V1_PROMPT } from './core-vision-engine-bottom-v1'
import { DASHBOARD_OCR_V2_PROMPT } from './dashboard-ocr-v2'
import { COLD_ENGINE_TOUCH_PROMPT } from './cold-engine-touch-v3'
import { ENGINE_AUDIO_V3_PROMPT } from './audio/engine-audio-v3'
import { ENGINE_AUDIO_HOT_V1_PROMPT } from './audio/engine-audio-hot-v1'
import { REGISTRATION_OCR_GEMINI_V3_PROMPT } from './registration-ocr-gemini-v3'

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
    // v3：Gemini 只負責解讀，前面已經跑過完整 DSP 管線（音質/Phase/事件偵測/
    // Hard Rule）——見 functions/src/ai/engine-audio/。這段 prompt 文字後面
    // 會被 engine-sensor-session.service.ts 動態接上一段 deterministic
    // context block 才送出，這裡看到的只是固定前綴。
    key: 'engine-audio-v3',
    label: '引擎啟動／怠速／油門音訊判定（DSP + Gemini）',
    defaultText: ENGINE_AUDIO_V3_PROMPT,
  },
  {
    // 買家複驗專用：上路後的熱車怠速／油門音訊判定，跟 engine-audio-v3 同一套
    // DSP 管線，只是沒有啟動階段（引擎在錄音開始前就已經在運轉）。
    key: 'engine-audio-hot-v1',
    label: '熱車怠速／油門音訊判定（買家複驗，DSP + Gemini）',
    defaultText: ENGINE_AUDIO_HOT_V1_PROMPT,
  },
  {
    // 2026-10 v3: 只問引擎號碼一個欄位——是否為行照由本機 OpenCV 樣板比對
    // （registration-document-template.service.ts，純離線、不用任何 API）
    // 先判斷，這支 prompt 只讀取遮罩後只露出引擎號碼那一列的圖，個資不會
    // 離開自己的後端。本機 Tesseract（registration-ocr.service.ts）降級成
    // 只有在這支 Gemini 呼叫本身失敗（額度/網路）時才用的備援。
    key: 'registration-ocr-gemini-v3',
    label: '行照 OCR（Gemini，僅引擎號碼，讀遮罩後圖片）',
    defaultText: REGISTRATION_OCR_GEMINI_V3_PROMPT,
  },
]

export const AI_PROMPT_MAP: ReadonlyMap<string, AiPromptDefinition> = new Map(
  AI_PROMPT_REGISTRY.map((definition) => [definition.key, definition]),
)
