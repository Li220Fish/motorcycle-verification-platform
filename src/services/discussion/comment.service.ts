import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '@/services/firebase/firebase'
import type { AuthorSnapshot, DiscussionComment } from './discussion.types'

const POSTS = 'discussionPosts'
const COMMENTS = 'comments'

interface CommentDoc {
  postId: string
  authorId: string
  authorSnapshot: AuthorSnapshot
  text: string
  status: 'published' | 'deleted'
  createdAt: Timestamp
}

function toComment(id: string, data: CommentDoc): DiscussionComment {
  return {
    id,
    postId: data.postId,
    authorId: data.authorId,
    authorSnapshot: data.authorSnapshot,
    text: data.text,
    status: data.status,
    createdAt: data.createdAt?.toMillis() ?? 0,
  }
}

function commentsCollection(postId: string) {
  return collection(db, POSTS, postId, COMMENTS)
}

function subscribeComments(
  postId: string,
  onChange: (comments: DiscussionComment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(commentsCollection(postId), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((docSnapshot) =>
          toComment(docSnapshot.id, docSnapshot.data() as CommentDoc),
        ),
      )
    },
    (error) => onError?.(error),
  )
}

async function addComment(
  postId: string,
  authorId: string,
  authorSnapshot: AuthorSnapshot,
  text: string,
): Promise<void> {
  const batch = writeBatch(db)
  const commentRef = doc(commentsCollection(postId))
  batch.set(commentRef, {
    postId,
    authorId,
    authorSnapshot,
    text,
    status: 'published',
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, POSTS, postId), { commentCount: increment(1) })
  await batch.commit()
}

async function deleteComment(postId: string, commentId: string): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(commentsCollection(postId), commentId), { status: 'deleted', text: '' })
  batch.update(doc(db, POSTS, postId), { commentCount: increment(-1) })
  await batch.commit()
}

async function editComment(postId: string, commentId: string, text: string): Promise<void> {
  await updateDoc(doc(commentsCollection(postId), commentId), { text })
}

export const commentService = { subscribeComments, addComment, deleteComment, editComment }
