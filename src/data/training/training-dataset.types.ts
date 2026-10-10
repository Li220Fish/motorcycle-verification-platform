/**
 * 訓練資料集 — data model shared by the developer capture app (capture-app/)
 * that WRITES these documents and the admin 訓練資料集 section
 * (src/admin/sections/TrainingDatasetSection.vue) that reviews/annotates
 * them. Deliberately separate from verifications/{id}/evidence: these are
 * staff-collected reference photos for model training, never a user's
 * inspection evidence, and carry no vehicle-ownership semantics.
 *
 * Collections:
 *   trainingSessions/{id}  — one physical bike photographed in one sitting
 *   trainingCaptures/{id}  — one photo (one shot of the shot plan)
 *   dataCollectors/{uid}   — allowlist of accounts allowed to upload
 * Storage: training/{collectorUid}/{sessionId}/{captureId}.jpg
 */

/** Axis-aligned box, normalized 0–1 (x/w against image width, y/h against
 *  image height). */
export interface NormalizedBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Oriented box — the training target is YOLO26-OBB, because fork legs,
 * shocks and chains are long diagonal parts an axis-aligned box can't hug.
 *
 * cx/w are fractions of image width, cy/h fractions of image height, angle
 * in degrees (clockwise, screen coordinates). The rotation is applied in
 * PIXEL space: the unrotated rectangle is (w·W) × (h·H) pixels centred at
 * (cx·W, cy·H), then rotated by `angle`. That keeps it a true rectangle on
 * any aspect ratio — see obbCorners().
 */
export interface ObbBox {
  cx: number
  cy: number
  w: number
  h: number
  angle: number
}

export interface TrainingAnnotation {
  /** A basic-health-check item key (see basic-health-check-items.ts). */
  label: string
  box: ObbBox
}

/** Four corners in pixels, clockwise from the unrotated top-left. */
export function obbCorners(box: ObbBox, W: number, H: number): [number, number][] {
  const cx = box.cx * W
  const cy = box.cy * H
  const hw = (box.w * W) / 2
  const hh = (box.h * H) / 2
  const r = (box.angle * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  return (
    [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ] as [number, number][]
  ).map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos])
}

/** Axis-aligned normalized bounds of an oriented box (for crops/metrics). */
export function obbBounds(box: ObbBox, W: number, H: number): NormalizedBox {
  const pts = obbCorners(box, W, H)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.max(0, Math.min(...xs))
  const y0 = Math.max(0, Math.min(...ys))
  const x1 = Math.min(W, Math.max(...xs))
  const y1 = Math.min(H, Math.max(...ys))
  return { x: x0 / W, y: y0 / H, w: (x1 - x0) / W, h: (y1 - y0) / H }
}

/** One YOLO-OBB label line: `class x1 y1 x2 y2 x3 y3 x4 y4`, corners
 *  normalized and clamped to [0,1] as Ultralytics expects. */
export function yoloObbLine(classIndex: number, box: ObbBox, W: number, H: number): string {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const coords = obbCorners(box, W, H).flatMap(([x, y]) => [clamp(x / W), clamp(y / H)])
  return [classIndex, ...coords.map((v) => v.toFixed(6))].join(' ')
}

export type VehicleType = 'scooter' | 'manual'

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  scooter: '速克達',
  manual: '檔車',
}

export interface CaptureQuality {
  /** Mean luminance 0–255 over the whole frame. */
  brightness: number
  /** Laplacian variance inside the primary guide region (higher = sharper),
   *  measured on a downscaled frame — only comparable to other values from
   *  the same measurement, not an absolute focus metric. */
  sharpness: number
  /** Device roll in degrees at shutter time (0 = phone held level); null
   *  when the browser exposed no orientation sensor. */
  rollDeg: number | null
  /** Device pitch in degrees (90 = phone upright). */
  pitchDeg: number | null
  /** Live warnings that were showing when the shutter was pressed. */
  warnings: string[]
}

export type TrainingCaptureStatus = 'pending' | 'approved' | 'rejected'

export interface TrainingCapture {
  id: string
  sessionId: string
  collectorUid: string
  vehicleModelId: string | null
  /** Snapshot for display/export without a vehicleModels join, and the only
   *  model identity when the bike isn't in the catalog (vehicleModelId null). */
  vehicleModelLabel: string
  vehicleType: VehicleType
  shotId: string
  partKey: string
  view: string
  shotPlanVersion: number
  storagePath: string
  width: number
  height: number
  /** The guide frames shown at capture time, already labelled — the admin
   *  editor seeds `annotations` from these until a human saves real ones. */
  guideAnnotations: TrainingAnnotation[]
  annotations: TrainingAnnotation[] | null
  quality: CaptureQuality
  device: { userAgent: string; videoWidth: number; videoHeight: number }
  status: TrainingCaptureStatus
  rejectReason: string | null
  reviewedAt: number | null
  capturedAt: number
}

export interface TrainingSession {
  id: string
  collectorUid: string
  vehicleModelId: string | null
  vehicleModelLabel: string
  /** Picks the guide-frame template set (scooter vs. manual geometry). */
  vehicleType: VehicleType
  hasChain: boolean
  notes: string
  /** shotId → reason, for shots the collector marked 不適用/看不到 (e.g. a
   *  single-shock scooter's right rear shock). A positive "this part is not
   *  visible on this model" signal is itself useful training metadata. */
  skippedShots: Record<string, string>
  status: 'open' | 'completed'
  createdAt: number
  updatedAt: number
}

export const TRAINING_COLLECTIONS = {
  sessions: 'trainingSessions',
  captures: 'trainingCaptures',
  collectors: 'dataCollectors',
} as const

export function trainingCaptureStoragePath(
  collectorUid: string,
  sessionId: string,
  captureId: string,
): string {
  return `training/${collectorUid}/${sessionId}/${captureId}.jpg`
}
