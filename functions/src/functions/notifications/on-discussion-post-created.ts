import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { isAdminUid } from '../../services/auth.service'
import { broadcastNotification } from '../../services/notification.service'

interface PostDoc {
  authorId: string
  title: string
  status: string
}

/** A post authored by the admin account (see admin-auth.service.ts client
 *  side — "being admin" is entirely the hardcoded uid, no separate
 *  authorRole field exists) is announced to every user, same as vehicle
 *  news / system broadcasts. */
export const onDiscussionPostCreated = onDocumentCreated(
  'discussionPosts/{postId}',
  async (event) => {
    const post = event.data?.data() as PostDoc | undefined
    if (!post || !isAdminUid(post.authorId) || post.status !== 'active') return

    const { postId } = event.params
    await broadcastNotification(
      {
        type: 'discussion_admin_post',
        title: '官方發布新文章',
        body: post.title,
        link: `/discussion/${postId}`,
      },
      post.authorId,
    )
  },
)
