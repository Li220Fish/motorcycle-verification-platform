import { doc, getDoc, setDoc } from 'firebase/firestore'

import type { UserUsageRole } from '@/types/user-preference'

import { db } from './firebase'

const COLLECTION = 'userPreferences'

function isUserUsageRole(value: unknown): value is UserUsageRole {
  return value === 'buyer' || value === 'seller' || value === 'professional_seller'
}

async function get(userId: string): Promise<UserUsageRole | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, userId))
  if (!snapshot.exists()) return null
  const role = snapshot.data().currentRole
  return isUserUsageRole(role) ? role : null
}

async function set(userId: string, role: UserUsageRole): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, userId),
    { currentRole: role, updatedAt: Date.now() },
    { merge: true },
  )
}

export const userPreferenceService = { get, set }
