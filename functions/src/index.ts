import { initializeApp } from 'firebase-admin/app'

initializeApp()

export {
  analyzeInspectionGroupA,
  retryInspectionGroupAItem,
} from './functions/analyze-inspection-group-a'
export {
  analyzeInspectionGroupB,
  retryInspectionGroupBItem,
} from './functions/analyze-inspection-group-b'
export {
  analyzeInspectionGroupC,
  retryInspectionGroupCItem,
} from './functions/analyze-inspection-group-c'
export { analyzeOcrDashboard, analyzeOcrPlate, analyzeOcrChassis } from './functions/analyze-ocr'
export { analyzeEngineSensorSession } from './functions/analyze-engine-sensor-session'
export { analyzeDocumentMaintenance } from './functions/analyze-document-maintenance'
export { analyzeEnvironmentSession } from './functions/analyze-environment'
export {
  analyzeColdEngineTouchCheck,
  retryColdEngineTouchCheck,
} from './functions/analyze-cold-engine-touch'
export { verifyVehicleRegistrationDocument } from './functions/analyze-vehicle-registration'
