import type { VerificationEvidence } from '@/types/verification-evidence'

import type { ProbeStage, ProbeStageResult } from './probe-protocol'

/**
 * Probe readings are stored as `voltage` evidence under this one synthetic
 * item id rather than as answers to checklist items: they're optional extra
 * data (only when the user opted in and a probe was connected), so they must
 * never count toward required-item progress or the 45-item buyer/seller
 * comparison. firestore.rules' evidence write rule doesn't restrict itemId,
 * so no rule change is needed.
 */
export const PROBE_EVIDENCE_ITEM_ID = 'PROBE-BATTERY'

/** Which engine session a reading was taken in — the same stage (CHARGE)
 *  can be measured twice for a buyer: at idle right after the cold start,
 *  and again in the 熱車 session after the ride. */
export type ProbeSessionKind = 'cold' | 'hot' | 'manual'

export interface ProbeEvidenceMetadata {
  stage: ProbeStage
  session: ProbeSessionKind
  status: ProbeStageResult['status']
  grade: ProbeStageResult['grade']
  judgment: string
  primaryValue: number | null
  values: Record<string, number>
  deviceName: string | null
  probeMode: 'ble' | 'mock'
  /** The firmware's JSON exactly as received. */
  firmware: Record<string, unknown>
}

export function buildProbeEvidence(params: {
  verificationId: string
  result: ProbeStageResult
  session: ProbeSessionKind
  deviceName: string | null
  probeMode: 'ble' | 'mock'
  itemId?: string
}): VerificationEvidence {
  const { result } = params
  const metadata: ProbeEvidenceMetadata = {
    stage: result.stage,
    session: params.session,
    status: result.status,
    grade: result.grade,
    judgment: result.judgment,
    primaryValue: result.primaryValue,
    values: result.values,
    deviceName: params.deviceName,
    probeMode: params.probeMode,
    firmware: { ...result.raw },
  }
  return {
    id: crypto.randomUUID(),
    verificationId: params.verificationId,
    itemId: params.itemId ?? PROBE_EVIDENCE_ITEM_ID,
    type: 'voltage',
    createdAt: result.receivedAt,
    captureSource: 'probe',
    captureTimestamp: result.receivedAt,
    metadata: metadata as unknown as Record<string, unknown>,
  }
}

export function readProbeEvidence(evidence: VerificationEvidence): ProbeEvidenceMetadata | null {
  const metadata = evidence.metadata as Partial<ProbeEvidenceMetadata> | undefined
  if (!metadata || typeof metadata.stage !== 'string' || typeof metadata.status !== 'string')
    return null
  return metadata as ProbeEvidenceMetadata
}
