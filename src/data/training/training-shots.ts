/**
 * 訓練資料拍攝計畫 — the fixed list of guided shots the developer capture app
 * (capture-app/) walks a collector through for one bike. Every shot maps to
 * one 基本12項健檢 item key (basic-health-check-items.ts — the single source
 * of truth for part keys/labels), so the admin annotation tool and the
 * trained YOLO26-OBB detector use exactly the same class vocabulary as the
 * runtime checklist.
 *
 * Guide frames are ORIENTED rectangles (and circles) that hug the part's own
 * shape and angle — a fork leg is a slanted bar, not an upright box. The
 * geometry is authored in a 300×400 viewBox (= the 3:4 portrait viewfinder,
 * which is also the crop the app stores), once per vehicle type, as seen from
 * the bike's LEFT side — standing there, the nose points to the photo's left
 * and a fork leg leans top-right → bottom-left. Right-side shots mirror it.
 * Each guide converts 1:1 into an ObbBox, which seeds the annotation editor.
 *
 * Bump TRAINING_SHOT_PLAN_VERSION whenever any geometry or framing
 * instruction changes — every capture records the version it was taken under.
 */
import {
  BASIC_HEALTH_CHECK_BASE_ITEMS,
  BASIC_HEALTH_CHECK_CHAIN_ITEM,
} from '@/data/verification/basic-health-check-items'
import type { ObbBox, TrainingAnnotation, VehicleType } from './training-dataset.types'

export const TRAINING_SHOT_PLAN_VERSION = 2

/** Viewfinder / stored image aspect (width / height). */
export const TRAINING_FRAME_ASPECT = 3 / 4
export const GUIDE_VIEW_W = 300
export const GUIDE_VIEW_H = 400

/** In viewBox units. `a` = degrees clockwise. */
export type GuideShape =
  | {
      kind: 'rect'
      label: string
      cx: number
      cy: number
      w: number
      h: number
      a: number
      hint?: boolean
    }
  | { kind: 'circle'; label: string; cx: number; cy: number; r: number; hint?: boolean }
  /** A dot marking an alignment point (axle, mount bolt). Never annotated. */
  | { kind: 'dot'; label: string; cx: number; cy: number; text: string }

export type TrainingShotStage = 'front' | 'left' | 'rear' | 'right' | 'extra'

export const TRAINING_STAGE_LABEL: Record<TrainingShotStage, string> = {
  front: '車頭',
  left: '左側',
  rear: '車尾',
  right: '右側',
  extra: '其他',
}

export interface TrainingShotDef {
  /** `${partKey}.${view}` — stable id persisted on every capture. */
  id: string
  partKey: string
  view: string
  stage: TrainingShotStage
  title: string
  /** Where to stand / how to hold the phone. */
  instruction: string
  /** Template authored for the left side; `mirror` flips it for right-side shots. */
  guides: Record<VehicleType, GuideShape[]>
  mirror?: boolean
  /** May be marked 不適用 (part absent/hidden on this bike). */
  optional?: boolean
  /** Any number of photos allowed (others: one, a retake replaces it). */
  repeatable?: boolean
  /** Only included when the bike is chain-driven. */
  chainOnly?: boolean
}

// --- geometry helpers (viewBox units) ---

const rect = (label: string, cx: number, cy: number, w: number, h: number, a = 0): GuideShape => ({
  kind: 'rect',
  label,
  cx,
  cy,
  w,
  h,
  a,
})
const circle = (label: string, cx: number, cy: number, r: number): GuideShape => ({
  kind: 'circle',
  label,
  cx,
  cy,
  r,
})
const hintRect = (
  label: string,
  cx: number,
  cy: number,
  w: number,
  h: number,
  a = 0,
): GuideShape => ({
  kind: 'rect',
  label,
  cx,
  cy,
  w,
  h,
  a,
  hint: true,
})
const dot = (cx: number, cy: number, text: string): GuideShape => ({
  kind: 'dot',
  label: '',
  cx,
  cy,
  text,
})

/** End point of a rotated rect along its long (h) axis. */
function rectEnd(
  cx: number,
  cy: number,
  h: number,
  a: number,
  which: 'top' | 'bottom',
): [number, number] {
  const r = (a * Math.PI) / 180
  const s = which === 'bottom' ? 1 : -1
  return [cx - s * (h / 2) * Math.sin(r), cy + s * (h / 2) * Math.cos(r)]
}

/**
 * Fork leg anchored at the axle, plus the wheel around it. Measured on the
 * reference photo set (low-angle side shots, wheel lower-middle): the axle
 * sits near (145, 265) of 300×400 and the leg leans 18–24° off vertical
 * toward the rear (photo right, for this left-side template).
 */
function forkFromAxle(
  ax: number,
  ay: number,
  len: number,
  w: number,
  a: number,
  wheelR: number,
): GuideShape[] {
  const r = (a * Math.PI) / 180
  const cx = ax + (Math.sin(r) * len) / 2
  const cy = ay - (Math.cos(r) * len) / 2
  return [
    rect('frontshock', cx, cy, w, len, a),
    circle('fronttire', ax, ay, wheelR),
    dot(ax, ay, '輪軸'),
  ]
}

function shockWithMounts(cx: number, cy: number, w: number, h: number, a: number): GuideShape[] {
  const [tx, ty] = rectEnd(cx, cy, h, a, 'top')
  const [bx, by] = rectEnd(cx, cy, h, a, 'bottom')
  return [rect('rearshock', cx, cy, w, h, a), dot(tx, ty, '上固定點'), dot(bx, by, '下固定點')]
}

function brake(label: string, cx: number, cy: number, r: number): GuideShape[] {
  // Caliper / drum lever sits ahead-and-below the hub; shown as a hint only
  // (it belongs to the same `frontbrake`/`rearbrake` class).
  return [circle(label, cx, cy, r), hintRect('', cx + r * 1.05, cy - r * 0.25, 30, 44, 12)]
}

const LOW_ANGLE = '蹲低到輪軸高度、手機直立，鏡頭正對車身側面'

/** Walk-around order: front → left side → rear → right side → extras. */
export const TRAINING_SHOTS: TrainingShotDef[] = [
  {
    id: 'headlight.front',
    partKey: 'headlight',
    view: 'front',
    stage: 'front',
    title: '大燈（正前方）',
    instruction: '站在車頭正前方約 1.5 公尺，手機與大燈同高，燈殼外緣貼齊框線，避免逆光。',
    guides: {
      scooter: [rect('headlight', 150, 190, 210, 78)],
      manual: [circle('headlight', 150, 190, 62)],
    },
  },
  {
    id: 'turnsignal.left',
    partKey: 'turnsignal',
    view: 'left',
    stage: 'front',
    title: '方向燈（左前）',
    instruction: '站在車頭左前方 45°，近拍左前方向燈，燈殼完整入框。',
    guides: {
      scooter: [rect('turnsignal', 150, 200, 160, 80)],
      manual: [rect('turnsignal', 150, 200, 120, 70)],
    },
  },
  {
    id: 'turnsignal.right',
    partKey: 'turnsignal',
    view: 'right',
    stage: 'front',
    title: '方向燈（右前）',
    instruction: '站在車頭右前方 45°，近拍右前方向燈，燈殼完整入框。',
    guides: {
      scooter: [rect('turnsignal', 150, 200, 160, 80)],
      manual: [rect('turnsignal', 150, 200, 120, 70)],
    },
  },
  {
    id: 'triple.top',
    partKey: 'triple',
    view: 'top',
    stage: 'front',
    title: '三角台（俯拍）',
    instruction:
      '站在坐墊後方往車頭俯拍，三角台與左右前叉上端落在框內。速克達被車殼包覆看不到時請標記不適用。',
    guides: {
      scooter: [rect('triple', 150, 200, 200, 80)],
      manual: [rect('triple', 150, 200, 230, 70)],
    },
    optional: true,
  },
  {
    id: 'frontshock.left',
    partKey: 'frontshock',
    view: 'left',
    stage: 'left',
    title: '前避震（左側）',
    instruction: `${LOW_ANGLE}。斜框貼齊前叉管，從土除下緣一路框到輪軸，圓點對準輪軸螺絲。`,
    guides: {
      scooter: forkFromAxle(145, 262, 120, 40, 22, 85),
      manual: forkFromAxle(145, 270, 190, 26, 20, 82),
    },
  },
  {
    id: 'frontbrake.detail',
    partKey: 'frontbrake',
    view: 'detail',
    stage: 'left',
    title: '前煞車（輪轂近拍）',
    instruction:
      '拍有卡鉗（碟煞）或煞車拉桿（鼓煞）的那一側：碟盤／鼓煞輪轂放進圓框，卡鉗或拉桿落在小斜框。',
    guides: {
      scooter: brake('frontbrake', 140, 230, 56),
      manual: brake('frontbrake', 140, 225, 72),
    },
  },
  {
    id: 'fronttire.side',
    partKey: 'fronttire',
    view: 'side',
    stage: 'left',
    title: '前輪（側面全輪）',
    instruction: `${LOW_ANGLE}，整顆前輪放進大圓，胎紋與胎側規格字要清楚可讀。`,
    guides: {
      scooter: [circle('fronttire', 150, 255, 118)],
      manual: [circle('fronttire', 150, 250, 128)],
    },
  },
  {
    id: 'fronttire.tread',
    partKey: 'fronttire',
    view: 'tread',
    stage: 'left',
    title: '前輪胎紋（近拍）',
    instruction: '將龍頭轉向一側，正對胎面近拍，看得到胎紋溝槽深度。',
    guides: {
      scooter: [rect('fronttire', 150, 200, 150, 260)],
      manual: [rect('fronttire', 150, 200, 130, 280)],
    },
    optional: true,
  },
  {
    id: 'seat.side',
    partKey: 'seat',
    view: 'side',
    stage: 'left',
    title: '坐墊（側面）',
    instruction: '站在車身左側退後一步，手機與坐墊同高，整條坐墊（前後端）都在框內。',
    guides: {
      scooter: [rect('seat', 150, 190, 260, 80, -6)],
      manual: [rect('seat', 150, 190, 250, 66, -4)],
    },
  },
  {
    id: 'rearshock.left',
    partKey: 'rearshock',
    view: 'left',
    stage: 'left',
    title: '後避震（左側）',
    instruction: `${LOW_ANGLE}。斜框貼齊避震器本體，上下兩個固定點對準圓點。`,
    guides: {
      scooter: shockWithMounts(150, 190, 46, 190, -15),
      manual: shockWithMounts(150, 190, 34, 200, -25),
    },
  },
  {
    id: 'chain.side',
    partKey: 'chain',
    view: 'side',
    stage: 'left',
    title: '鏈條（側面）',
    instruction: `${LOW_ANGLE}，斜框順著鏈條走向，從前齒盤框到後齒盤。`,
    guides: {
      scooter: [rect('chain', 150, 235, 260, 46, -6)],
      manual: [rect('chain', 150, 235, 270, 44, -8)],
    },
    // Phone sessions start unclassified (hasChain unknown) — never required.
    optional: true,
    chainOnly: true,
  },
  {
    id: 'reartire.side',
    partKey: 'reartire',
    view: 'side',
    stage: 'left',
    title: '後輪（側面全輪）',
    instruction: `${LOW_ANGLE}，整顆後輪放進大圓，注意排氣管不要遮住胎紋。`,
    guides: {
      scooter: [circle('reartire', 150, 255, 118)],
      manual: [circle('reartire', 150, 250, 128)],
    },
  },
  {
    id: 'rearbrake.detail',
    partKey: 'rearbrake',
    view: 'detail',
    stage: 'left',
    title: '後煞車（輪轂近拍）',
    instruction: '拍有卡鉗或煞車拉桿的那一側：碟盤／鼓煞輪轂放進圓框，卡鉗或拉桿落在小斜框。',
    guides: {
      scooter: brake('rearbrake', 140, 230, 56),
      manual: brake('rearbrake', 140, 225, 68),
    },
  },
  {
    id: 'reartire.tread',
    partKey: 'reartire',
    view: 'tread',
    stage: 'rear',
    title: '後輪胎紋（近拍）',
    instruction: '從車尾正後方蹲低，正對後輪胎面近拍，看得到胎紋溝槽深度。',
    guides: {
      scooter: [rect('reartire', 150, 220, 160, 250)],
      manual: [rect('reartire', 150, 220, 140, 270)],
    },
    optional: true,
  },
  {
    id: 'taillight.rear',
    partKey: 'taillight',
    view: 'rear',
    stage: 'rear',
    title: '尾燈（正後方）',
    instruction: '站在車尾正後方約 1.5 公尺，手機與尾燈同高，整組尾燈落在框內。',
    guides: {
      scooter: [rect('taillight', 150, 190, 200, 80)],
      manual: [rect('taillight', 150, 190, 130, 70)],
    },
  },
  {
    id: 'rearshock.right',
    partKey: 'rearshock',
    view: 'right',
    stage: 'right',
    title: '後避震（右側）',
    instruction: `${LOW_ANGLE}。單避震速克達右側沒有避震器時請標記不適用。`,
    guides: {
      scooter: shockWithMounts(150, 190, 46, 190, -15),
      manual: shockWithMounts(150, 190, 34, 200, -25),
    },
    mirror: true,
    optional: true,
  },
  {
    id: 'frontshock.right',
    partKey: 'frontshock',
    view: 'right',
    stage: 'right',
    title: '前避震（右側）',
    instruction: `${LOW_ANGLE}。斜框貼齊前叉管，從土除下緣一路框到輪軸，圓點對準輪軸螺絲。`,
    guides: {
      scooter: forkFromAxle(145, 262, 120, 40, 22, 85),
      manual: forkFromAxle(145, 270, 190, 26, 20, 82),
    },
    mirror: true,
  },
  {
    id: 'othermod.detail',
    partKey: 'othermod',
    view: 'detail',
    stage: 'extra',
    title: '其他改裝品',
    instruction: '每個改裝件各拍一張，改裝件置中。沒有改裝可標記不適用。',
    guides: {
      scooter: [rect('othermod', 150, 200, 210, 280)],
      manual: [rect('othermod', 150, 200, 210, 280)],
    },
    optional: true,
    repeatable: true,
  },
]

export function trainingShotsFor(hasChain: boolean): TrainingShotDef[] {
  return TRAINING_SHOTS.filter((s) => hasChain || !s.chainOnly)
}

export function findTrainingShot(id: string): TrainingShotDef | undefined {
  return TRAINING_SHOTS.find((s) => s.id === id)
}

function mirrorShape(g: GuideShape): GuideShape {
  if (g.kind === 'rect') return { ...g, cx: GUIDE_VIEW_W - g.cx, a: -g.a }
  return { ...g, cx: GUIDE_VIEW_W - g.cx }
}

/** The guide shapes to draw for this shot on this kind of bike. */
export function shotGuides(shot: TrainingShotDef, type: VehicleType): GuideShape[] {
  const base = shot.guides[type]
  return shot.mirror ? base.map(mirrorShape) : base
}

/** Guide → normalized oriented box (see ObbBox for the coordinate contract). */
export function guideToObb(g: GuideShape): ObbBox | null {
  if (g.kind === 'rect') {
    return {
      cx: g.cx / GUIDE_VIEW_W,
      cy: g.cy / GUIDE_VIEW_H,
      w: g.w / GUIDE_VIEW_W,
      h: g.h / GUIDE_VIEW_H,
      angle: g.a,
    }
  }
  if (g.kind === 'circle') {
    const d = g.r * 2
    return {
      cx: g.cx / GUIDE_VIEW_W,
      cy: g.cy / GUIDE_VIEW_H,
      w: d / GUIDE_VIEW_W,
      h: d / GUIDE_VIEW_H,
      angle: 0,
    }
  }
  return null
}

/** Annotation seeds for a capture: every labelled, non-hint guide. */
export function guideAnnotationsFor(
  shot: TrainingShotDef,
  type: VehicleType,
): TrainingAnnotation[] {
  return shotGuides(shot, type).flatMap((g) => {
    if (g.kind === 'dot' || g.hint || !g.label) return []
    const box = guideToObb(g)
    return box ? [{ label: g.label, box }] : []
  })
}

/** Ordered class list for the detector — index = YOLO class id. Never
 *  reorder; append only (existing label files depend on the indices). */
export const TRAINING_PART_LABELS: { key: string; label: string }[] = [
  ...BASIC_HEALTH_CHECK_BASE_ITEMS,
  BASIC_HEALTH_CHECK_CHAIN_ITEM,
].map(({ key, label }) => ({ key, label }))

export function partLabel(key: string): string {
  return TRAINING_PART_LABELS.find((p) => p.key === key)?.label ?? key
}

export function partClassIndex(key: string): number {
  return TRAINING_PART_LABELS.findIndex((p) => p.key === key)
}

/** Best-effort default from the catalog's free-text bodyType. */
export function guessVehicleType(bodyType: string | null, hasChain: boolean): VehicleType {
  const t = (bodyType ?? '').toLowerCase()
  if (/速克達|scooter|電動/.test(t)) return 'scooter'
  if (/檔|街車|跑車|仿賽|重機|manual|sport|naked|cruiser|越野|復古/.test(t)) return 'manual'
  return hasChain ? 'manual' : 'scooter'
}
