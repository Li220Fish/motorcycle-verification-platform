import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/media/image-compression.service', () => ({
  imageCompressionService: {
    compressImage: vi.fn(async (b: Blob) => ({ blob: b, width: 1, height: 1 })),
  },
}))

import { chatService } from '@/services/chat/chat.service'
import { conversationService } from '@/services/chat/conversation.service'
import { useAuthStore } from '@/stores/auth.store'
import { useChatStore } from '@/stores/chat.store'
import * as fs from '../fakes/firestore'
import * as st from '../fakes/storage'

const NOW = new Date(2026, 9, 18, 12, 0).getTime()
const flush = () => new Promise((r) => setTimeout(r, 0))
const me = { displayName: 'Me' }
const them = { displayName: 'Them' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('conversationService', () => {
  it('findOrCreateConversation reuses the same pair + listing, but not across listings', async () => {
    const a = await conversationService.findOrCreateConversation(
      'u1',
      me,
      'u2',
      them,
      { listingId: 'L1' },
      '買家詢問',
    )
    const again = await conversationService.findOrCreateConversation('u1', me, 'u2', them, {
      listingId: 'L1',
    })
    const other = await conversationService.findOrCreateConversation('u1', me, 'u2', them, {
      listingId: 'L2',
    })
    const general = await conversationService.findOrCreateConversation('u1', me, 'u2', them)
    expect(again).toBe(a)
    expect(other).not.toBe(a)
    expect(general).not.toBe(a)
    expect(await conversationService.findOrCreateConversation('u1', me, 'u2', them)).toBe(general)
    expect(fs.__get(`conversations/${a}`)).toMatchObject({
      memberIds: ['u1', 'u2'],
      tag: '買家詢問',
      unreadCounts: { u1: 0, u2: 0 },
      mutedBy: [],
      archivedBy: [],
    })
  })

  it('toConversation tolerates legacy plain-number timestamps', async () => {
    fs.__seed('conversations/c', {
      memberIds: ['u1', 'u2'],
      lastMessage: { type: 'text', text: 'hi', senderId: 'u1', createdAt: 123 },
      lastMessageAt: 456,
      lastReadAtBy: { u1: fs.Timestamp.fromMillis(7) },
    })
    expect(await conversationService.getConversation('c')).toMatchObject({
      lastMessage: { createdAt: 123 },
      lastMessageAt: 456,
      lastReadAtBy: { u1: 7 },
      unreadCounts: {},
      mutedBy: [],
    })
    expect(await conversationService.getConversation('none')).toBeNull()
  })

  it('markRead / setTag / mute / archive', async () => {
    fs.__seed('conversations/c', {
      memberIds: ['u1', 'u2'],
      unreadCounts: { u1: 3, u2: 1 },
      mutedBy: [],
      archivedBy: [],
    })
    await conversationService.markRead('c', 'u1')
    await conversationService.setTag('c', '交易中')
    await conversationService.setMuted('c', 'u1', true)
    await conversationService.setMuted('c', 'u1', true)
    await conversationService.setArchived('c', 'u1', true)
    let saved = fs.__get('conversations/c')!
    expect(saved.unreadCounts).toEqual({ u1: 0, u2: 1 })
    expect((saved.lastReadAtBy as Record<string, unknown>).u1).toBeInstanceOf(fs.Timestamp)
    expect(saved.tag).toBe('交易中')
    expect(saved.mutedBy).toEqual(['u1'])
    expect(saved.archivedBy).toEqual(['u1'])
    await conversationService.setMuted('c', 'u1', false)
    await conversationService.setArchived('c', 'u1', false)
    saved = fs.__get('conversations/c')!
    expect(saved.mutedBy).toEqual([])
    expect(saved.archivedBy).toEqual([])
  })

  it('blocking is checked in both directions', async () => {
    expect(await conversationService.isBlocked('u1', 'u2')).toBe(false)
    await conversationService.blockUser('u2', 'u1')
    expect(await conversationService.isBlocked('u1', 'u2')).toBe(true)
    await conversationService.unblockUser('u2', 'u1')
    expect(await conversationService.isBlocked('u1', 'u2')).toBe(false)
  })

  it('subscribeConversations lists my conversations newest first', async () => {
    fs.__seed('conversations/old', {
      memberIds: ['u1', 'x'],
      lastMessageAt: fs.Timestamp.fromMillis(1),
    })
    fs.__seed('conversations/new', {
      memberIds: ['u1', 'y'],
      lastMessageAt: fs.Timestamp.fromMillis(2),
    })
    fs.__seed('conversations/notmine', {
      memberIds: ['z', 'y'],
      lastMessageAt: fs.Timestamp.fromMillis(3),
    })
    const seen: string[][] = []
    conversationService.subscribeConversations('u1', (list) => seen.push(list.map((c) => c.id)))
    await flush()
    expect(seen).toEqual([['new', 'old']])
  })
})

describe('chatService', () => {
  beforeEach(() =>
    fs.__seed('conversations/c', { memberIds: ['u1', 'u2'], unreadCounts: { u1: 0, u2: 0 } }),
  )

  it("sendText writes the message and bumps the other member's unread count atomically", async () => {
    await chatService.sendText('c', 'u1', ['u2'], 'hello', { displayName: 'Me v2', photoUrl: null })
    const conv = fs.__get('conversations/c')!
    expect(conv.unreadCounts).toEqual({ u1: 0, u2: 1 })
    expect(conv.lastMessage).toMatchObject({ type: 'text', text: 'hello', senderId: 'u1' })
    expect((conv.memberSnapshots as Record<string, unknown>).u1).toEqual({
      displayName: 'Me v2',
      photoUrl: null,
    })
    const msgs = fs.__paths('conversations/c/messages/')
    expect(msgs).toHaveLength(1)
    expect(fs.__get(msgs[0])).toMatchObject({ senderId: 'u1', type: 'text', text: 'hello' })
  })

  it('sendImage uses the reserved id and an "[圖片]" preview; system notes have type system', async () => {
    const id = chatService.reserveMessageId('c')
    await chatService.sendImage('c', 'u1', ['u2'], 'conversations/c/u1/x/image.jpg', id)
    expect(fs.__get(`conversations/c/messages/${id}`)!.imageUrl).toBe(
      'conversations/c/u1/x/image.jpg',
    )
    expect((fs.__get('conversations/c')!.lastMessage as { text: string }).text).toBe('[圖片]')
    await chatService.sendSystemNote('c', 'u1', ['u2'], '已預約')
    expect((fs.__get('conversations/c')!.lastMessage as { type: string }).type).toBe('system')
    expect(fs.__get('conversations/c')!.unreadCounts).toEqual({ u1: 0, u2: 2 })
  })

  it('a send into a missing conversation fails without leaving an orphan message', async () => {
    await expect(chatService.sendText('ghost', 'u1', ['u2'], 'x')).rejects.toThrow()
    expect(fs.__paths('conversations/ghost')).toEqual([])
  })

  it('subscribeLatestMessages returns the last 30 oldest-first; loadOlderMessages pages back', async () => {
    for (let i = 0; i < 35; i++) {
      fs.__seed(`conversations/c/messages/m${String(i).padStart(2, '0')}`, {
        senderId: 'u1',
        type: 'text',
        text: `#${i}`,
        createdAt: fs.Timestamp.fromMillis(1000 + i),
      })
    }
    let latest: string[] = []
    chatService.subscribeLatestMessages('c', (list) => (latest = list.map((m) => m.text!)))
    await flush()
    expect(latest).toHaveLength(30)
    expect(latest[0]).toBe('#5')
    expect(latest[29]).toBe('#34')
    const older = await chatService.loadOlderMessages('c', 1005)
    expect(older.map((m) => m.text)).toEqual(['#0', '#1', '#2', '#3', '#4'])
  })
})

describe('chat store', () => {
  function signIn() {
    useAuthStore().user = {
      id: 'u1',
      email: 'me@x.com',
      displayName: null,
      photoUrl: null,
    } as never
  }

  it('unreadTotal sums my unread counts across conversations', async () => {
    fs.__seed('conversations/a', {
      memberIds: ['u1', 'u2'],
      unreadCounts: { u1: 2 },
      lastMessageAt: fs.Timestamp.fromMillis(1),
    })
    fs.__seed('conversations/b', {
      memberIds: ['u1', 'u3'],
      unreadCounts: { u1: 3, u3: 9 },
      lastMessageAt: fs.Timestamp.fromMillis(2),
    })
    const store = useChatStore()
    expect(store.unreadTotal).toBe(0)
    store.subscribeConversations('u1')
    await flush()
    expect(store.conversationsLoaded).toBe(true)
    expect(store.unreadTotal).toBe(5)
    store.stopConversationsSubscription()
    expect(store.conversations).toEqual([])
  })

  it('findOrCreateConversation requires a session and tags listing chats as buyer inquiries', async () => {
    const store = useChatStore()
    await expect(store.findOrCreateConversation(me, 'u2', them)).rejects.toThrow(
      'not authenticated',
    )
    store.subscribeConversations('u1')
    const id = await store.findOrCreateConversation(me, 'u2', them, { listingId: 'L1' })
    expect(fs.__get(`conversations/${id}`)!.tag).toBe('買家詢問')
  })

  it('open → send text/image → mark read → close', async () => {
    signIn()
    fs.__seed('conversations/c', {
      memberIds: ['u1', 'u2'],
      unreadCounts: { u1: 4, u2: 0 },
      lastMessageAt: fs.Timestamp.fromMillis(1),
    })
    const store = useChatStore()
    store.subscribeConversations('u1')
    store.openConversation('c')
    await flush()
    expect(store.currentConversation!.id).toBe('c')
    expect(store.messagesLoaded).toBe(true)

    await store.sendText('   ')
    expect(fs.__paths('conversations/c/messages/')).toEqual([])
    await store.sendText('  hi  ')
    vi.setSystemTime(NOW + 1000)
    await store.sendImageFile(new Blob(['img']))
    await flush()
    expect(store.messages.map((m) => m.type)).toEqual(['text', 'image'])
    expect(store.messages[0].text).toBe('hi')
    expect(st.__paths()[0]).toMatch(/^conversations\/c\/u1\/.+\/image\.jpg$/)
    // sender's display name falls back to email when unset
    expect(
      (fs.__get('conversations/c')!.memberSnapshots as Record<string, { displayName: string }>).u1
        .displayName,
    ).toBe('me@x.com')

    await store.markCurrentConversationRead()
    expect((fs.__get('conversations/c')!.unreadCounts as Record<string, number>).u1).toBe(0)

    store.closeConversation()
    expect(store.currentConversation).toBeNull()
    expect(store.messages).toEqual([])
  })

  it('a failed send surfaces sendError and rethrows', async () => {
    signIn()
    fs.__seed('conversations/c', { memberIds: ['u1', 'u2'] })
    const store = useChatStore()
    store.subscribeConversations('u1')
    store.openConversation('c')
    await flush()
    fs.__failNext('writeBatch.commit', new Error('offline'))
    await expect(store.sendText('x')).rejects.toThrow('offline')
    expect(store.sendError).toBe('offline')
  })
})
