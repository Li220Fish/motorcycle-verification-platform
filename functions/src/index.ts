import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Verification v2 — supersedes analyzeInspectionGroupA/B/C (deleted along
// with group-a/b/c-inspection.service.ts and their prompt/retry files).
export {
  analyzeCoreVisionV2Fn as analyzeCoreVisionV2,
  retryCoreVisionV2ItemFn as retryCoreVisionV2Item,
} from './functions/analyze-core-vision-v2'
export { analyzeOcrDashboard } from './functions/analyze-ocr'
// Verification v2 — supersedes the sessionType-dispatched
// analyzeEngineSensorSession (3 separate startup/idle/rev calls).
export { analyzeEngineSensorSessionV2Fn as analyzeEngineSensorSessionV2 } from './functions/analyze-engine-sensor-session'
export { analyzeDocumentMaintenance } from './functions/analyze-document-maintenance'
export {
  analyzeColdEngineTouchCheck,
  retryColdEngineTouchCheck,
} from './functions/analyze-cold-engine-touch'
export { verifyVehicleRegistrationDocument } from './functions/analyze-vehicle-registration'
// Admin 後台「AI Prompt 設定」— lets an admin view/edit the prompt text sent
// to Gemini without a code deploy (see services/prompt-config.service.ts).
export { getAiPromptCatalog } from './functions/get-ai-prompt-catalog'
