import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Verification v2 — supersedes analyzeInspectionGroupA/B/C (deleted along
// with group-a/b/c-inspection.service.ts and their prompt/retry files).
// retryCoreVisionV2Item (a 9th route here) was removed 2026-09 — no UI ever
// called it, and the low-light photos it existed to work around are now
// prevented at capture time (forced torch) instead. The single consolidated
// analyzeCoreVisionV2 route was itself split 2026-09 into 4 independent
// routes (one per photo group) — see analyze-core-vision-split.ts.
export {
  analyzeCoreVisionSidesFn as analyzeCoreVisionSides,
  analyzeCoreVisionRearFn as analyzeCoreVisionRear,
  analyzeCoreVisionFrontSuspensionFn as analyzeCoreVisionFrontSuspension,
  analyzeCoreVisionEngineBottomFn as analyzeCoreVisionEngineBottom,
} from './functions/analyze-core-vision-split'
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

// In-app notification center — the first Firestore-triggered (as opposed to
// callable) Functions in this codebase. Each writes into the relevant
// user(s)' users/{uid}/notifications subcollection via
// services/notification.service.ts; see src/views/NotificationsView.vue and
// src/types/notification.ts on the client side.
export { onMessageCreated } from './functions/notifications/on-message-created'
export { onFavoriteCreated } from './functions/notifications/on-favorite-created'
export { onAppointmentCreated } from './functions/notifications/on-appointment-created'
export { onAppointmentStatusUpdated } from './functions/notifications/on-appointment-status-updated'
export { onDiscussionCommentCreated } from './functions/notifications/on-discussion-comment-created'
export { onDiscussionLikeCreated } from './functions/notifications/on-discussion-like-created'
export { onDiscussionPostCreated } from './functions/notifications/on-discussion-post-created'
export { onDiscussionPostFeatured } from './functions/notifications/on-discussion-post-featured'
export { onVehicleNewsCreated } from './functions/notifications/on-vehicle-news-created'
export { onSystemAnnouncementCreated } from './functions/notifications/on-system-announcement-created'

// Keeps conversations/{id}.memberSnapshots' displayName in sync with each
// member's actual current users/{uid}.displayName, so 聊天室 stops showing a
// stale/mismatched name relative to 討論中心 — see on-user-profile-updated.ts
// (ongoing, fires on rename) and admin-sync-conversation-names.ts (one-time
// backfill for conversations that were already wrong before this existed).
export { onUserProfileUpdated } from './functions/on-user-profile-updated'
export { adminSyncConversationMemberNames } from './functions/admin-sync-conversation-names'
