import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '@/services/firebase/firebase'
import type {
  AuthorSnapshot,
  DiscussionCategory,
  DiscussionMedia,
  DiscussionPost,
  DiscussionSort,
  PostStatus,
  ReportReason,
  ReportTargetType,
} from './discussion.types'

const POSTS = 'discussionPosts'
const PAGE_SIZE = 20

interface PostDoc {
  authorId: string
  authorSnapshot: AuthorSnapshot
  title: string
  body: string
  category: DiscussionCategory
  media: DiscussionMedia[]
  likeCount: number
  commentCount: number
  featured: boolean
  status: PostStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

function toPost(id: string, data: PostDoc): DiscussionPost {
  return {
    id,
    authorId: data.authorId,
    authorSnapshot: data.authorSnapshot,
    title: data.title,
    body: data.body,
    category: data.category,
    media: data.media ?? [],
    likeCount: data.likeCount ?? 0,
    commentCount: data.commentCount ?? 0,
    featured: !!data.featured,
    status: data.status,
    createdAt: data.createdAt?.toMillis() ?? 0,
    updatedAt: data.updatedAt?.toMillis() ?? 0,
  }
}

interface CreatePostInput {
  authorId: string
  authorSnapshot: AuthorSnapshot
  title: string
  body: string
  category: DiscussionCategory
  media?: DiscussionMedia[]
}

async function createPost(input: CreatePostInput): Promise<string> {
  const docRef = await addDoc(collection(db, POSTS), {
    authorId: input.authorId,
    authorSnapshot: input.authorSnapshot,
    title: input.title,
    body: input.body,
    category: input.category,
    media: input.media ?? [],
    likeCount: 0,
    commentCount: 0,
    featured: false,
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/** For a freshly-created post's Storage path before the doc exists yet. */
function reservePostId(): string {
  return doc(collection(db, POSTS)).id
}

async function createPostWithId(id: string, input: CreatePostInput): Promise<void> {
  await setDoc(doc(db, POSTS, id), {
    authorId: input.authorId,
    authorSnapshot: input.authorSnapshot,
    title: input.title,
    body: input.body,
    category: input.category,
    media: input.media ?? [],
    likeCount: 0,
    commentCount: 0,
    featured: false,
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

async function getPost(id: string): Promise<DiscussionPost | null> {
  const snapshot = await getDoc(doc(db, POSTS, id))
  if (!snapshot.exists()) return null
  return toPost(snapshot.id, snapshot.data() as PostDoc)
}

function subscribePost(id: string, onChange: (post: DiscussionPost | null) => void): Unsubscribe {
  return onSnapshot(doc(db, POSTS, id), (snapshot) => {
    onChange(snapshot.exists() ? toPost(snapshot.id, snapshot.data() as PostDoc) : null)
  })
}

/**
 * `following` needs the caller's list of followed author IDs (Firestore
 * can't join against a subcollection in a query) — capped at 30 because
 * that's the `in` operator's limit; a heavier following list is a V-next
 * problem (see §53/§105 of the spec).
 */
function subscribePosts(
  sort: DiscussionSort,
  onChange: (posts: DiscussionPost[]) => void,
  options: { followingIds?: string[]; onError?: (error: Error) => void } = {},
): Unsubscribe {
  const base = collection(db, POSTS)
  let q
  if (sort === 'hot') {
    q = query(
      base,
      where('status', '==', 'published'),
      orderBy('likeCount', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    )
  } else if (sort === 'featured') {
    q = query(
      base,
      where('status', '==', 'published'),
      where('featured', '==', true),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    )
  } else if (sort === 'following') {
    const ids = (options.followingIds ?? []).slice(0, 30)
    if (ids.length === 0) {
      onChange([])
      return () => {}
    }
    q = query(
      base,
      where('status', '==', 'published'),
      where('authorId', 'in', ids),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    )
  } else {
    q = query(
      base,
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    )
  }

  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((docSnapshot) => toPost(docSnapshot.id, docSnapshot.data() as PostDoc)),
      )
    },
    (error) => options.onError?.(error),
  )
}

async function updatePost(id: string, changes: { title?: string; body?: string }): Promise<void> {
  await updateDoc(doc(db, POSTS, id), { ...changes, updatedAt: serverTimestamp() })
}

async function softDeletePost(id: string): Promise<void> {
  await updateDoc(doc(db, POSTS, id), { status: 'deleted', updatedAt: serverTimestamp() })
}

// --- Likes: discussionPosts/{postId}/likes/{uid} — doc ID IS the liker's uid. ---

async function isLiked(postId: string, uid: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, POSTS, postId, 'likes', uid))
  return snapshot.exists()
}

async function toggleLike(postId: string, uid: string): Promise<boolean> {
  const postRef = doc(db, POSTS, postId)
  const likeRef = doc(db, POSTS, postId, 'likes', uid)
  return runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef)
    if (likeSnap.exists()) {
      tx.delete(likeRef)
      tx.update(postRef, { likeCount: increment(-1) })
      return false
    }
    tx.set(likeRef, { uid, createdAt: serverTimestamp() })
    tx.update(postRef, { likeCount: increment(1) })
    return true
  })
}

// --- Following: users/{uid}/following/{targetUid} ---

async function followUser(uid: string, targetUid: string): Promise<void> {
  if (uid === targetUid) return
  await setDoc(doc(db, 'users', uid, 'following', targetUid), {
    targetUid,
    followedAt: serverTimestamp(),
  })
}

async function unfollowUser(uid: string, targetUid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'following', targetUid))
}

async function isFollowing(uid: string, targetUid: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, 'users', uid, 'following', targetUid))
  return snapshot.exists()
}

async function listFollowingIds(uid: string): Promise<string[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'following'))
  return snapshot.docs.map((docSnapshot) => docSnapshot.id)
}

// --- Bookmarks: users/{uid}/savedPosts/{postId} ---

async function savePost(uid: string, postId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'savedPosts', postId), { postId, savedAt: serverTimestamp() })
}

async function unsavePost(uid: string, postId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'savedPosts', postId))
}

async function listSavedPosts(uid: string): Promise<DiscussionPost[]> {
  const savedSnapshot = await getDocs(collection(db, 'users', uid, 'savedPosts'))
  const ids = savedSnapshot.docs.map((docSnapshot) => docSnapshot.id).slice(0, 30)
  if (ids.length === 0) return []
  const postsSnapshot = await getDocs(query(collection(db, POSTS), where(documentId(), 'in', ids)))
  return postsSnapshot.docs.map((docSnapshot) =>
    toPost(docSnapshot.id, docSnapshot.data() as PostDoc),
  )
}

/** Posts authored by one user, for their own "我的討論" list (§55). */
async function listPostsByAuthor(authorId: string): Promise<DiscussionPost[]> {
  const snapshot = await getDocs(
    query(collection(db, POSTS), where('authorId', '==', authorId), orderBy('createdAt', 'desc')),
  )
  return snapshot.docs.map((docSnapshot) => toPost(docSnapshot.id, docSnapshot.data() as PostDoc))
}

// --- Reports (§57) ---

async function reportContent(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
): Promise<void> {
  await addDoc(collection(db, 'discussionReports'), {
    reporterId,
    targetType,
    targetId,
    reason,
    createdAt: serverTimestamp(),
    status: 'pending',
  })
}

export const discussionService = {
  createPost,
  reservePostId,
  createPostWithId,
  getPost,
  subscribePost,
  subscribePosts,
  updatePost,
  softDeletePost,
  isLiked,
  toggleLike,
  followUser,
  unfollowUser,
  isFollowing,
  listFollowingIds,
  savePost,
  unsavePost,
  listSavedPosts,
  listPostsByAuthor,
  reportContent,
}
