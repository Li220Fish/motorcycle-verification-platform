export type DiscussionCategory =
  '購車討論' | '賣車討論' | '保養維修' | '車款交流' | '騎乘生活' | '驗車討論' | '其他'

export const DISCUSSION_CATEGORIES: DiscussionCategory[] = [
  '購車討論',
  '賣車討論',
  '保養維修',
  '車款交流',
  '騎乘生活',
  '驗車討論',
  '其他',
]

export type DiscussionSort = 'hot' | 'new' | 'featured' | 'following'

export interface AuthorSnapshot {
  displayName: string
}

export interface DiscussionMedia {
  url: string
  storagePath: string
}

export type PostStatus = 'active' | 'hidden' | 'deleted'

export interface DiscussionPost {
  id: string
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
  createdAt: number
  updatedAt: number
}

export interface DiscussionComment {
  id: string
  postId: string
  authorId: string
  authorSnapshot: AuthorSnapshot
  text: string
  status: PostStatus
  /** No threaded-reply UI yet — always null, reserved by the schema. */
  parentCommentId: string | null
  createdAt: number
}

export type ReportTargetType = 'post' | 'comment' | 'user'

export type ReportReason = '垃圾內容' | '不當言論' | '詐騙疑慮' | '個資' | '其他'
