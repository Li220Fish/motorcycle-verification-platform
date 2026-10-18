import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

/** 車輛轉移時讓「被轉移方」看到是誰轉給他的：用戶名＋中間打 * 的用戶 ID。 */
export interface TransferParty {
  displayName: string
  maskedId: string
}

export function maskUserId(uid: string): string {
  if (uid.length <= 8) return `${uid.slice(0, 2)}****${uid.slice(-2)}`
  return `${uid.slice(0, 4)}******${uid.slice(-4)}`
}

export async function describeTransferParty(uid: string): Promise<TransferParty> {
  const db = getFirestore()
  const snap = await db.collection('users').doc(uid).get().catch(() => null)
  let displayName = (snap?.data()?.displayName as string | null | undefined)?.trim() || ''
  if (!displayName) {
    const authUser = await getAuth()
      .getUser(uid)
      .catch(() => null)
    displayName = authUser?.displayName?.trim() || authUser?.email?.split('@')[0] || '用戶'
  }
  return { displayName, maskedId: maskUserId(uid) }
}
