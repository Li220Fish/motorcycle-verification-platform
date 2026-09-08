import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { broadcastNotification } from '../../services/notification.service'

interface PostDoc {
  authorId: string
  title: string
  featured: boolean
}

/** Fires only on the false -> true transition (an admin action — see
 *  discussion.service.ts's setFeatured — there's no client path that flips
 *  it back and forth repeatedly, so no debounce/guard against re-firing is
 *  needed beyond this edge check). */
export const onDiscussionPostFeatured = onDocumentUpdated(
  'discussionPosts/{postId}',
  async (event) => {
    const before = event.data?.before.data() as PostDoc | undefined
    const after = event.data?.after.data() as PostDoc | undefined
    if (!before || !after) return
    if (before.featured || !after.featured) return

    const { postId } = event.params
    await broadcastNotification({
      type: 'discussion_featured',
      title: '討論中心精選文章',
      body: after.title,
      link: `/discussion/${postId}`,
    })
  },
)
