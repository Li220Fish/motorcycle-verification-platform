import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { createNotification } from '../../services/notification.service'

interface CommentDoc {
  authorId: string
  authorSnapshot: { displayName: string }
  text: string
  parentCommentId?: string | null
}

interface PostDoc {
  authorId: string
  title: string
}

/**
 * One new comment can produce up to two DIFFERENT recipients:
 *  - the post's author (someone commented on your post)
 *  - the parent comment's author, if this is a reply (someone replied to
 *    your comment)
 * If both resolve to the same person, only the more specific "reply"
 * notification fires — otherwise they'd get two notifications for one
 * comment.
 */
export const onDiscussionCommentCreated = onDocumentCreated(
  'discussionPosts/{postId}/comments/{commentId}',
  async (event) => {
    const comment = event.data?.data() as CommentDoc | undefined
    if (!comment) return

    const { postId } = event.params
    const db = getFirestore()
    const postSnap = await db.collection('discussionPosts').doc(postId).get()
    const post = postSnap.data() as PostDoc | undefined
    if (!post) return

    const commenterName = comment.authorSnapshot?.displayName ?? '有人'
    let replyRecipient: string | null = null

    if (comment.parentCommentId) {
      const parentSnap = await db
        .collection('discussionPosts')
        .doc(postId)
        .collection('comments')
        .doc(comment.parentCommentId)
        .get()
      const parent = parentSnap.data() as CommentDoc | undefined
      if (parent && parent.authorId !== comment.authorId) {
        replyRecipient = parent.authorId
        await createNotification(parent.authorId, {
          type: 'discussion_reply',
          title: `${commenterName} 回覆了你的留言`,
          body: comment.text,
          link: `/discussion/${postId}`,
        })
      }
    }

    if (post.authorId !== comment.authorId && post.authorId !== replyRecipient) {
      await createNotification(post.authorId, {
        type: 'discussion_comment',
        title: `${commenterName} 留言了你的文章`,
        body: comment.text,
        link: `/discussion/${postId}`,
      })
    }
  },
)
