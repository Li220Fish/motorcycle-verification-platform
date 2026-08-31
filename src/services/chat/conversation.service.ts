import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '@/services/firebase/firebase'
import type {
  Conversation,
  ConversationContext,
  ConversationTag,
  MemberSnapshot,
} from './chat.types'

const COLLECTION = 'conversations'

interface ConversationDoc {
  memberIds: string[]
  memberSnapshots: Record<string, MemberSnapshot>
  context?: ConversationContext
  tag: ConversationTag
  lastMessage: Conversation['lastMessage']
  lastMessageAt: Timestamp | null
  unreadCounts: Record<string, number>
  lastReadAtBy: Record<string, Timestamp>
  mutedBy: string[]
  archivedBy: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

function toConversation(id: string, data: ConversationDoc): Conversation {
  const lastReadAtBy: Record<string, number> = {}
  for (const [uid, ts] of Object.entries(data.lastReadAtBy ?? {})) {
    lastReadAtBy[uid] = ts?.toMillis?.() ?? 0
  }
  return {
    id,
    memberIds: data.memberIds,
    memberSnapshots: data.memberSnapshots,
    context: data.context,
    tag: data.tag,
    lastMessage: data.lastMessage ?? null,
    lastMessageAt: data.lastMessageAt?.toMillis() ?? 0,
    unreadCounts: data.unreadCounts ?? {},
    lastReadAtBy,
    mutedBy: data.mutedBy ?? [],
    archivedBy: data.archivedBy ?? [],
    createdAt: data.createdAt?.toMillis() ?? 0,
    updatedAt: data.updatedAt?.toMillis() ?? 0,
  }
}

/**
 * Reuses an existing 1:1 conversation for the same pair of members and the
 * same listing context if one already exists (see §33 of the spec — don't
 * spawn a new thread every time "聯絡賣家" is tapped on the same listing).
 * Firestore can't compound array-contains with equality on a nested map
 * cheaply, so this fetches the (small) set of the current user's
 * conversations and filters client-side.
 */
async function findOrCreateConversation(
  currentUid: string,
  currentSnapshot: MemberSnapshot,
  otherUid: string,
  otherSnapshot: MemberSnapshot,
  context?: ConversationContext,
  tag: ConversationTag = '一般',
): Promise<string> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('memberIds', 'array-contains', currentUid)),
  )
  const existing = snapshot.docs.find((docSnapshot) => {
    const data = docSnapshot.data() as ConversationDoc
    const sameMembers = data.memberIds.length === 2 && data.memberIds.includes(otherUid)
    const sameListing = context?.listingId
      ? data.context?.listingId === context.listingId
      : !data.context?.listingId
    return sameMembers && sameListing
  })
  if (existing) return existing.id

  const docRef = await addDoc(collection(db, COLLECTION), {
    memberIds: [currentUid, otherUid],
    memberSnapshots: { [currentUid]: currentSnapshot, [otherUid]: otherSnapshot },
    context: context ?? null,
    tag,
    lastMessage: null,
    lastMessageAt: serverTimestamp(),
    unreadCounts: { [currentUid]: 0, [otherUid]: 0 },
    lastReadAtBy: {},
    mutedBy: [],
    archivedBy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

async function getConversation(id: string): Promise<Conversation | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, id))
  if (!snapshot.exists()) return null
  return toConversation(snapshot.id, snapshot.data() as ConversationDoc)
}

/** Live list of every conversation the user is a member of, newest first. */
function subscribeConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('memberIds', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((docSnapshot) =>
          toConversation(docSnapshot.id, docSnapshot.data() as ConversationDoc),
        ),
      )
    },
    (error) => onError?.(error),
  )
}

function subscribeConversation(
  id: string,
  onChange: (conversation: Conversation | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, COLLECTION, id), (snapshot) => {
    onChange(
      snapshot.exists() ? toConversation(snapshot.id, snapshot.data() as ConversationDoc) : null,
    )
  })
}

async function markRead(conversationId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, conversationId), {
    [`unreadCounts.${uid}`]: 0,
    [`lastReadAtBy.${uid}`]: serverTimestamp(),
  })
}

async function setTag(conversationId: string, tag: ConversationTag): Promise<void> {
  await updateDoc(doc(db, COLLECTION, conversationId), { tag, updatedAt: serverTimestamp() })
}

async function setMuted(conversationId: string, uid: string, muted: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, conversationId), {
    mutedBy: muted ? arrayUnion(uid) : arrayRemove(uid),
  })
}

async function setArchived(conversationId: string, uid: string, archived: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, conversationId), {
    archivedBy: archived ? arrayUnion(uid) : arrayRemove(uid),
  })
}

// --- Blocking (§36) — stored per-user so a block is always self-scoped. ---

async function blockUser(uid: string, targetUid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'blockedUsers', targetUid), {
    blockedUid: targetUid,
    createdAt: serverTimestamp(),
  })
}

async function unblockUser(uid: string, targetUid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'blockedUsers', targetUid))
}

async function isBlocked(uid: string, targetUid: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'blockedUsers', targetUid)),
    getDoc(doc(db, 'users', targetUid, 'blockedUsers', uid)),
  ])
  return a.exists() || b.exists()
}

export const conversationService = {
  findOrCreateConversation,
  getConversation,
  subscribeConversations,
  subscribeConversation,
  markRead,
  setTag,
  setMuted,
  setArchived,
  blockUser,
  unblockUser,
  isBlocked,
}
