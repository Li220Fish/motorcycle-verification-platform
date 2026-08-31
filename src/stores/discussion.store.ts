import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Unsubscribe } from 'firebase/firestore'

import { commentService } from '@/services/discussion/comment.service'
import { discussionService } from '@/services/discussion/discussion.service'
import { storageService } from '@/services/firebase/storage.service'
import type {
  AuthorSnapshot,
  DiscussionCategory,
  DiscussionComment,
  DiscussionPost,
  DiscussionSort,
} from '@/services/discussion/discussion.types'

export const useDiscussionStore = defineStore('discussion', () => {
  const posts = ref<DiscussionPost[]>([])
  const postsLoaded = ref(false)
  const sort = ref<DiscussionSort>('hot')
  const followingIds = ref<string[]>([])

  const currentPost = ref<DiscussionPost | null>(null)
  const comments = ref<DiscussionComment[]>([])
  const commentsLoaded = ref(false)

  let unsubPosts: Unsubscribe | null = null
  let unsubCurrentPost: Unsubscribe | null = null
  let unsubComments: Unsubscribe | null = null

  async function subscribeToSort(nextSort: DiscussionSort, uid?: string): Promise<void> {
    sort.value = nextSort
    postsLoaded.value = false
    unsubPosts?.()
    if (nextSort === 'following' && uid) {
      followingIds.value = await discussionService.listFollowingIds(uid)
    }
    unsubPosts = discussionService.subscribePosts(
      nextSort,
      (list) => {
        posts.value = list
        postsLoaded.value = true
      },
      { followingIds: followingIds.value },
    )
  }

  function stopPostsSubscription(): void {
    unsubPosts?.()
    unsubPosts = null
    posts.value = []
    postsLoaded.value = false
  }

  function openPost(postId: string): void {
    closePost()
    commentsLoaded.value = false
    unsubCurrentPost = discussionService.subscribePost(postId, (post) => {
      currentPost.value = post
    })
    unsubComments = commentService.subscribeComments(postId, (list) => {
      comments.value = list
      commentsLoaded.value = true
    })
  }

  function closePost(): void {
    unsubCurrentPost?.()
    unsubComments?.()
    unsubCurrentPost = null
    unsubComments = null
    currentPost.value = null
    comments.value = []
    commentsLoaded.value = false
  }

  interface CreatePostInput {
    authorId: string
    authorSnapshot: AuthorSnapshot
    title: string
    body: string
    category: DiscussionCategory
    images: File[]
  }

  async function createPost(input: CreatePostInput): Promise<string> {
    if (input.images.length === 0) {
      return discussionService.createPost({
        authorId: input.authorId,
        authorSnapshot: input.authorSnapshot,
        title: input.title,
        body: input.body,
        category: input.category,
      })
    }
    const postId = discussionService.reservePostId()
    const media = await Promise.all(
      input.images.slice(0, 4).map(async (file, index) => {
        const storagePath = `discussion-media/${postId}/${index}.jpg`
        const url = await storageService.uploadFileAtPath(storagePath, file)
        return { url, storagePath }
      }),
    )
    await discussionService.createPostWithId(postId, {
      authorId: input.authorId,
      authorSnapshot: input.authorSnapshot,
      title: input.title,
      body: input.body,
      category: input.category,
      media,
    })
    return postId
  }

  async function toggleLike(postId: string, uid: string): Promise<boolean> {
    return discussionService.toggleLike(postId, uid)
  }

  async function addComment(
    postId: string,
    authorId: string,
    authorSnapshot: AuthorSnapshot,
    text: string,
  ) {
    if (!text.trim()) return
    await commentService.addComment(postId, authorId, authorSnapshot, text.trim())
  }

  async function toggleFollow(
    uid: string,
    targetUid: string,
    currentlyFollowing: boolean,
  ): Promise<void> {
    if (currentlyFollowing) await discussionService.unfollowUser(uid, targetUid)
    else await discussionService.followUser(uid, targetUid)
  }

  return {
    posts,
    postsLoaded,
    sort,
    currentPost,
    comments,
    commentsLoaded,
    subscribeToSort,
    stopPostsSubscription,
    openPost,
    closePost,
    createPost,
    toggleLike,
    addComment,
    toggleFollow,
  }
})
