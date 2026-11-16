import { Preferences } from '@capacitor/preferences'
import {
  collection,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { ref, uploadBytes } from 'firebase/storage'

import { CALIBRATION_PHASES, rmsDb, type AudioLevels, type Baseline } from '@tofu/core/calibration'
import type { ImuSample } from '@tofu/core/imu'
import type { Grade, TofuEvent } from '@tofu/core/tofu-engine'

import { db, storage } from './firebase'

export type VehicleType = 'scooter' | 'manual'

/** What the phone keeps locally so the game works offline after calibrating. */
export interface LocalCalibration {
  calibrationId: string
  createdAt: number
  vehicleType: VehicleType
  baseline: Baseline
}

const LOCAL_KEY = 'tofu:calibration'
const SAFETY_KEY = 'tofu:safetyAccepted'

export async function loadLocalCalibration(): Promise<LocalCalibration | null> {
  const { value } = await Preferences.get({ key: LOCAL_KEY })
  if (!value) return null
  try {
    return JSON.parse(value) as LocalCalibration
  } catch {
    return null
  }
}

export async function isSafetyAccepted(): Promise<boolean> {
  return (await Preferences.get({ key: SAFETY_KEY })).value === 'yes'
}

export async function acceptSafety(): Promise<void> {
  await Preferences.set({ key: SAFETY_KEY, value: 'yes' })
}

/** idle/rev loudness from the calibration recording (best effort — some
 *  WebViews can't decode AAC, the baseline is still valid without it). */
export async function measureAudioLevels(blob: Blob): Promise<AudioLevels> {
  try {
    const context = new AudioContext()
    const decoded = await context.decodeAudioData(await blob.arrayBuffer())
    const pcm = decoded.getChannelData(0)
    const s = (ms: number) => ms / 1000
    const levels = {
      idleDb: rmsDb(pcm, decoded.sampleRate, s(CALIBRATION_PHASES.idle.startMs), s(CALIBRATION_PHASES.idle.endMs)),
      revDb: rmsDb(pcm, decoded.sampleRate, s(CALIBRATION_PHASES.rev.startMs), s(CALIBRATION_PHASES.rev.endMs)),
    }
    void context.close()
    return levels
  } catch {
    return { idleDb: null, revDb: null }
  }
}

function deviceInfo(): Record<string, string> {
  return { userAgent: navigator.userAgent.slice(0, 200), language: navigator.language }
}

/**
 * Uploads the raw calibration (engine audio + full IMU) for research and
 * stores the baseline both in Firestore and on the phone.
 */
export async function saveCalibration(params: {
  uid: string
  vehicleType: VehicleType
  baseline: Baseline
  audio: Blob
  samples: ImuSample[]
  startedAt: number
}): Promise<LocalCalibration> {
  const calibrationRef = doc(collection(db, 'tofuCalibrations'))
  const folder = `tofu/${params.uid}/calibrations/${calibrationRef.id}`
  const extension = params.audio.type.includes('webm') ? 'webm' : 'aac'
  const audioPath = `${folder}/engine.${extension}`
  const imuPath = `${folder}/imu.json`
  const imuJson = JSON.stringify({
    schemaVersion: 1,
    sessionType: 'tofu-calibration-hot-v1',
    phases: CALIBRATION_PHASES,
    vehicleType: params.vehicleType,
    samples: params.samples.map((s) => ({
      tMs: s.t - params.startedAt,
      ax: s.x,
      ay: s.y,
      az: s.z,
      gx: s.gx,
      gy: s.gy,
      gz: s.gz,
    })),
  })
  await Promise.all([
    uploadBytes(ref(storage, audioPath), params.audio, { contentType: params.audio.type || 'audio/aac' }),
    uploadBytes(ref(storage, imuPath), new Blob([imuJson], { type: 'application/json' }), {
      contentType: 'application/json',
    }),
  ])
  await setDoc(calibrationRef, {
    uid: params.uid,
    vehicleType: params.vehicleType,
    baseline: params.baseline,
    audioPath,
    imuPath,
    device: deviceInfo(),
    createdAt: serverTimestamp(),
  })
  await setDoc(
    doc(db, 'tofuProfiles', params.uid),
    { uid: params.uid, latestCalibrationId: calibrationRef.id, updatedAt: serverTimestamp() },
    { merge: true },
  )
  const local: LocalCalibration = {
    calibrationId: calibrationRef.id,
    createdAt: Date.now(),
    vehicleType: params.vehicleType,
    baseline: params.baseline,
  }
  await Preferences.set({ key: LOCAL_KEY, value: JSON.stringify(local) })
  return local
}

export interface RunRecord {
  id?: string
  uid: string
  calibrationId: string
  startedAt: number
  endedAt: number
  distanceMeters: number
  durationSeconds: number
  integrity: number
  grade: Grade | null
  events: TofuEvent[]
  eventCounts: { sway: number; bump: number }
  path: Array<[number, number]>
}

export async function saveRun(run: RunRecord): Promise<string> {
  const runRef = doc(collection(db, 'tofuRuns'))
  await setDoc(runRef, {
    ...run,
    // Firestore can't store nested arrays — keep the route as {lat,lng} objects.
    path: run.path.map(([lat, lng]) => ({ lat, lng })),
    events: run.events.slice(0, 50),
    createdAt: serverTimestamp(),
  })
  await setDoc(
    doc(db, 'tofuProfiles', run.uid),
    {
      uid: run.uid,
      deliveries: increment(run.grade && run.grade !== '失敗' ? 1 : 0),
      runs: increment(1),
      totalMeters: increment(Math.round(run.distanceMeters)),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  return runRef.id
}

export async function listRuns(uid: string): Promise<RunRecord[]> {
  // Owner filter only (no composite index); newest first client-side.
  const snapshot = await getDocs(query(collection(db, 'tofuRuns'), where('uid', '==', uid)))
  return snapshot.docs
    .map((d) => {
      const data = d.data() as Omit<RunRecord, 'path'> & {
        path: Array<{ lat: number; lng: number }>
        createdAt?: Timestamp
      }
      return { ...data, id: d.id, path: data.path.map((p) => [p.lat, p.lng] as [number, number]) }
    })
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 50)
}
