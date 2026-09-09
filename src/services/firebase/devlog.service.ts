import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from './firebase'
import type {
  CountdownState,
  DevLogOverride,
  DevLogSubmissionDoc,
  DevLogSubmissionInput,
} from '@/types/devlog'

/** /dev-log is a link-open internal tool (no auth), so every collection
 *  below is fully open in firestore.rules — keep them scoped to these
 *  names only, never reuse them for anything auth-gated. */
const SUBMISSIONS_PAGE_SIZE = 200

function submissionsCollection() {
  return collection(db, 'devlog_submissions')
}

function overridesCollection() {
  return collection(db, 'devlog_overrides')
}

function countdownDocRef() {
  return doc(db, 'devlog_settings', 'countdown')
}

function subscribeSubmissions(
  onChange: (docs: Array<{ id: string; data: DevLogSubmissionDoc }>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    submissionsCollection(),
    orderBy('submittedAt', 'desc'),
    limit(SUBMISSIONS_PAGE_SIZE),
  )
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((d) => ({ id: d.id, data: d.data() as DevLogSubmissionDoc })))
    },
    (error) => onError?.(error),
  )
}

async function addSubmission(input: DevLogSubmissionInput): Promise<void> {
  const payload: DevLogSubmissionDoc = { ...input, submittedAt: new Date().toISOString() }
  await addDoc(submissionsCollection(), payload)
}

function subscribeCountdown(
  onChange: (state: CountdownState | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    countdownDocRef(),
    (snap) => onChange(snap.exists() ? (snap.data() as CountdownState) : null),
    (error) => onError?.(error),
  )
}

async function saveCountdown(state: CountdownState): Promise<void> {
  await setDoc(countdownDocRef(), state)
}

/** One doc per edited base entry (git/manual-log/team-sheet/submission),
 * doc id = that entry's `id` — a correction layered on top at render time,
 * never a rewrite of the underlying source (git history, the work log,
 * the team sheet). */
function subscribeOverrides(
  onChange: (overrides: Record<string, DevLogOverride>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    overridesCollection(),
    (snapshot) => {
      const map: Record<string, DevLogOverride> = {}
      for (const d of snapshot.docs) map[d.id] = d.data() as DevLogOverride
      onChange(map)
    },
    (error) => onError?.(error),
  )
}

async function saveOverride(entryId: string, override: DevLogOverride): Promise<void> {
  await setDoc(doc(overridesCollection(), entryId), override)
}

export const devlogService = {
  subscribeSubmissions,
  addSubmission,
  subscribeCountdown,
  saveCountdown,
  subscribeOverrides,
  saveOverride,
}
