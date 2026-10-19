/** Realistic props for components whose required props need real shapes
 *  (render-smoke.test.ts). Keyed by component file name. */
import { MOCK_MARKET_LISTINGS } from '@/data/home/marketplace-mock'

export const vehicle = {
  id: 'veh1',
  currentOwnerId: 'u1',
  modelId: null,
  brand: 'YAMAHA',
  model: 'MT-03',
  manufactureYear: 2021,
  mileage: 8000,
  registrationDate: null,
  displacementCc: 321,
  transmission: '6速手排',
  color: '藍',
  modified: false,
  modificationNote: null,
  licensePlate: 'ABC-1234',
  engineNumber: null,
  chassisNumber: null,
  photos: [],
  registrationDocumentUrl: null,
  registrationDocumentMaskedUrl: null,
  sortOrder: null,
  createdAt: 0,
  updatedAt: 0,
}

export const conversation = {
  id: 'c1',
  memberIds: ['u1', 'u2'],
  memberSnapshots: { u1: { displayName: 'Me' }, u2: { displayName: 'Them', photoUrl: null } },
  context: { listingId: 'L1' },
  tag: '買家詢問',
  lastMessage: { type: 'text', text: 'hi', senderId: 'u2', createdAt: 0 },
  lastMessageAt: 0,
  unreadCounts: { u1: 2 },
  lastReadAtBy: {},
  mutedBy: [],
  archivedBy: [],
  createdAt: 0,
  updatedAt: 0,
}

export const post = {
  id: 'p1',
  authorId: 'u2',
  authorSnapshot: { displayName: 'Author', photoUrl: null },
  title: '保養問題',
  body: '內容',
  category: '保養維修',
  media: [],
  likeCount: 1,
  commentCount: 2,
  featured: false,
  status: 'active',
  createdAt: 0,
  updatedAt: 0,
}

export const comment = {
  id: 'cm1',
  postId: 'p1',
  authorId: 'u2',
  authorSnapshot: { displayName: 'Author' },
  text: '同意',
  status: 'active',
  parentCommentId: null,
  createdAt: 0,
}

export const trainingCapture = {
  id: 'tc1',
  sessionId: 's1',
  collectorUid: 'u1',
  vehicleModelId: null,
  vehicleModelLabel: 'YAMAHA MT-03',
  vehicleType: 'manual',
  shotId: 'side-left',
  partKey: 'headlight',
  view: 'left',
  shotPlanVersion: 2,
  storagePath: 'training/u1/s1/tc1.jpg',
  width: 300,
  height: 400,
  guideAnnotations: [{ label: 'headlight', box: { cx: 0.5, cy: 0.5, w: 0.2, h: 0.2, angle: 0 } }],
  annotations: null,
  quality: { brightness: 120, sharpness: 300, rollDeg: 0, pitchDeg: 90, warnings: [] },
  device: { userAgent: 'test', videoWidth: 1920, videoHeight: 1080 },
  status: 'pending',
  rejectReason: null,
  reviewedAt: null,
  capturedAt: 0,
}

export const fixtureProps: Record<string, Record<string, unknown>> = {
  VehicleCard: { vehicle },
  VehicleStatusCard: { vehicle },
  ConversationRow: { conversation, currentUid: 'u1' },
  DiscussionPostCard: { post },
  CommentItem: { comment, canDelete: true },
  VehicleMarketCard: { listing: MOCK_MARKET_LISTINGS[0] },
  VehicleMarketRow: { listing: MOCK_MARKET_LISTINGS[0] },
  TrainingAnnotationEditor: { capture: trainingCapture, imageUrl: null, models: [] },
}
