import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { createNotification } from '../../services/notification.service'

interface PostDoc {
  authorId: string
  title: string
}

/** discussionPosts/{postId}/likes/{uid} — doc ID IS the liker's uid (see
 *  discussion.service.ts's toggleLike). */
export const onDiscussionLikeCreated = onDocumentCreated(
  'discussionPosts/{postId}/likes/{uid}',
  async (event) => {
    const { postId, uid } = event.params
    const db = getFirestore()
    const postSnap = await db.collection('discussionPosts').doc(postId).get()
    const post = postSnap.data() as PostDoc | undefined
    if (!post || post.authorId === uid) return

    await createNotification(post.authorId, {
      type: 'discussion_like',
      title: '你的文章有新的愛心',
      body: post.title,
      link: `/discussion/${postId}`,
    })
  },
)
