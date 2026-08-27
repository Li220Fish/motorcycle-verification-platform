import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'

import type { VoltageAnalysisResult, VoltageSession } from '@/types/voltage-session'

import { db } from './firebase'

const COLLECTION = 'voltageSessions'

export type VoltageSessionDraft = Pick<VoltageSession, 'vehicleId' | 'verificationId' | 'probeId'>

/**
 * Only the session summary is written to Firestore. Raw high-frequency
 * samples stay local (see probe.store.ts) — see README "Raw Voltage Data"
 * for why this is a deliberate boundary, not a missing feature.
 */
async function start(draft: VoltageSessionDraft): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...draft,
    startedAt: serverTimestamp(),
  })
  return docRef.id
}

async function finish(id: string, result: VoltageAnalysisResult): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    endedAt: serverTimestamp(),
    result,
  })
}

export const voltageSessionService = { start, finish }
