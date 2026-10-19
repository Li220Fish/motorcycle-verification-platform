import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { commentService } from '@/services/discussion/comment.service'
import { discussionService } from '@/services/discussion/discussion.service'
import { DISCUSSION_CATEGORIES } from '@/services/discussion/discussion.types'
import { useDiscussionStore } from '@/stores/discussion.store'
import * as fs from '../fakes/firestore'
import * as st from '../fakes/storage'

const NOW = new Date(2026, 9, 18, 12, 0).getTime()
const flush = () => new Promise((r) => setTimeout(r, 0))
const author = { displayName: 'A' }

function seedPost(id: string, extra: Record<string, unknown> = {}) {
  fs.__seed(`discussionPosts/${id}`, {
    authorId: 'u1',
    authorSnapshot: author,
    title: id,
    body: 'b',
    category: '其他',
    likeCount: 0,
    commentCount: 0,
    featured: false,
    status: 'active',
    createdAt: fs.Timestamp.fromMillis(1),
    ...extra,
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('discussion posts', () => {
  it('has the 7 categories', () => {
    expect(DISCUSSION_CATEGORIES).toHaveLength(7)
  })

  it('createPost starts active with zeroed counters', async () => {
    const id = await discussionService.createPost({
      authorId: 'u1',
      authorSnapshot: author,
      title: 't',
      body: 'b',
      category: '保養維修',
    })
    expect(await discussionService.getPost(id)).toMatchObject({
      likeCount: 0,
      commentCount: 0,
      featured: false,
      status: 'active',
      media: [],
      createdAt: NOW,
    })
    expect(await discussionService.getPost('none')).toBeNull()
  })

  it('update / soft delete / feature', async () => {
    seedPost('p')
    await discussionService.updatePost('p', { title: 'new' })
    await discussionService.setFeatured('p', true)
    expect(fs.__get('discussionPosts/p')).toMatchObject({ title: 'new', featured: true })
    await discussionService.softDeletePost('p')
    expect(fs.__get('discussionPosts/p')!.status).toBe('deleted')
  })

  it('subscribePosts: hot / new / featured / following, active only', async () => {
    seedPost('popular', { likeCount: 10, createdAt: fs.Timestamp.fromMillis(1) })
    seedPost('fresh', { likeCount: 0, createdAt: fs.Timestamp.fromMillis(5) })
    seedPost('starred', {
      likeCount: 1,
      featured: true,
      authorId: 'u2',
      createdAt: fs.Timestamp.fromMillis(3),
    })
    seedPost('gone', { likeCount: 99, status: 'deleted' })
    const ids = async (sort: 'hot' | 'new' | 'featured' | 'following', followingIds?: string[]) => {
      let out: string[] = []
      discussionService.subscribePosts(sort, (list) => (out = list.map((p) => p.id)), {
        followingIds,
      })
      await flush()
      return out
    }
    expect(await ids('hot')).toEqual(['popular', 'starred', 'fresh'])
    expect(await ids('new')).toEqual(['fresh', 'starred', 'popular'])
    expect(await ids('featured')).toEqual(['starred'])
    expect(await ids('following', ['u2'])).toEqual(['starred'])
    expect(await ids('following', [])).toEqual([])
  })

  it('toggleLike flips the like and keeps likeCount in sync', async () => {
    seedPost('p')
    expect(await discussionService.toggleLike('p', 'u9')).toBe(true)
    expect(await discussionService.isLiked('p', 'u9')).toBe(true)
    expect(fs.__get('discussionPosts/p')!.likeCount).toBe(1)
    expect(await discussionService.toggleLike('p', 'u9')).toBe(false)
    expect(await discussionService.isLiked('p', 'u9')).toBe(false)
    expect(fs.__get('discussionPosts/p')!.likeCount).toBe(0)
  })

  it('follow / unfollow (never yourself)', async () => {
    await discussionService.followUser('u1', 'u1')
    expect(await discussionService.listFollowingIds('u1')).toEqual([])
    await discussionService.followUser('u1', 'u2')
    expect(await discussionService.isFollowing('u1', 'u2')).toBe(true)
    expect(await discussionService.listFollowingIds('u1')).toEqual(['u2'])
    await discussionService.unfollowUser('u1', 'u2')
    expect(await discussionService.isFollowing('u1', 'u2')).toBe(false)
  })

  it('bookmarks: save / list / unsave', async () => {
    seedPost('p1')
    seedPost('p2')
    expect(await discussionService.listSavedPosts('u1')).toEqual([])
    await discussionService.savePost('u1', 'p2')
    expect((await discussionService.listSavedPosts('u1')).map((p) => p.id)).toEqual(['p2'])
    await discussionService.unsavePost('u1', 'p2')
    expect(await discussionService.listSavedPosts('u1')).toEqual([])
  })

  it('listPostsByAuthor / reportContent', async () => {
    seedPost('a', { createdAt: fs.Timestamp.fromMillis(1) })
    seedPost('b', { createdAt: fs.Timestamp.fromMillis(2) })
    seedPost('c', { authorId: 'u2' })
    expect((await discussionService.listPostsByAuthor('u1')).map((p) => p.id)).toEqual(['b', 'a'])
    await discussionService.reportContent('u2', 'post', 'a', '詐騙疑慮')
    const [report] = fs.__paths('discussionReports/')
    expect(fs.__get(report)).toMatchObject({
      reporterId: 'u2',
      targetType: 'post',
      targetId: 'a',
      reason: '詐騙疑慮',
      status: 'pending',
    })
  })
})

describe('comments', () => {
  it('add / edit / delete keep commentCount in sync; deleted text is blanked', async () => {
    seedPost('p')
    await commentService.addComment('p', 'u2', author, 'first')
    let list: { id: string; text: string; status: string }[] = []
    commentService.subscribeComments('p', (c) => (list = c))
    await flush()
    expect(fs.__get('discussionPosts/p')!.commentCount).toBe(1)
    const id = list[0].id
    await commentService.editComment('p', id, 'edited')
    await flush()
    expect(list[0].text).toBe('edited')
    await commentService.deleteComment('p', id)
    await flush()
    expect(list[0]).toMatchObject({ status: 'deleted', text: '' })
    expect(fs.__get('discussionPosts/p')!.commentCount).toBe(0)
  })
})

describe('discussion store', () => {
  it('createPost without images → plain post; with images → up to 4 uploaded media', async () => {
    const store = useDiscussionStore()
    const plain = await store.createPost({
      authorId: 'u1',
      authorSnapshot: author,
      title: 't',
      body: 'b',
      category: '其他',
      images: [],
    })
    expect(fs.__get(`discussionPosts/${plain}`)!.media).toEqual([])
    const files = Array.from({ length: 6 }, (_, i) => new File([String(i)], `${i}.jpg`))
    const withMedia = await store.createPost({
      authorId: 'u1',
      authorSnapshot: author,
      title: 't',
      body: 'b',
      category: '其他',
      images: files,
    })
    const media = fs.__get(`discussionPosts/${withMedia}`)!.media as {
      storagePath: string
      url: string
    }[]
    expect(media.map((m) => m.storagePath)).toEqual(
      [0, 1, 2, 3].map((i) => `discussion-media/${withMedia}/${i}.jpg`),
    )
    expect(st.__paths()).toHaveLength(4)
  })

  it('subscribeToSort("following") loads following ids first', async () => {
    seedPost('mine', { authorId: 'u2' })
    seedPost('other', { authorId: 'u3' })
    await discussionService.followUser('u1', 'u2')
    const store = useDiscussionStore()
    await store.subscribeToSort('following', 'u1')
    await flush()
    expect(store.posts.map((p) => p.id)).toEqual(['mine'])
    expect(store.sort).toBe('following')
    store.stopPostsSubscription()
    expect(store.posts).toEqual([])
  })

  it('openPost / addComment (trimmed, empty ignored) / closePost / toggleFollow / toggleLike', async () => {
    seedPost('p')
    const store = useDiscussionStore()
    store.openPost('p')
    await store.addComment('p', 'u2', author, '   ')
    await store.addComment('p', 'u2', author, '  nice  ')
    await flush()
    expect(store.currentPost!.id).toBe('p')
    expect(store.comments.map((c) => c.text)).toEqual(['nice'])
    expect(await store.toggleLike('p', 'u2')).toBe(true)
    await store.toggleFollow('u2', 'u1', false)
    expect(await discussionService.isFollowing('u2', 'u1')).toBe(true)
    await store.toggleFollow('u2', 'u1', true)
    expect(await discussionService.isFollowing('u2', 'u1')).toBe(false)
    store.closePost()
    expect(store.currentPost).toBeNull()
    expect(store.comments).toEqual([])
  })
})
