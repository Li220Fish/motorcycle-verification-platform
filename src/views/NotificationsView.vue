<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  Bell,
  Calendar,
  Heart,
  Megaphone,
  MessageCircle,
  Newspaper,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useNotificationStore } from '@/stores/notification.store'
import { formatRelativeTime } from '@/utils/format-time'
import type { AppNotification, NotificationType } from '@/types/notification'

const router = useRouter()
const notificationStore = useNotificationStore()

const ICONS: Record<NotificationType, LucideIcon> = {
  chat_message: MessageCircle,
  listing_favorited: Heart,
  booking_request: Calendar,
  system: Megaphone,
  vehicle_news: Newspaper,
  discussion_featured: Sparkles,
  discussion_admin_post: Megaphone,
  discussion_comment: MessageCircle,
  discussion_like: Heart,
  discussion_reply: MessageCircle,
}

interface DisplayGroup {
  /** `link` for a collapsed 訊息 group (one row per conversation), the
   *  notification's own id otherwise. */
  key: string
  /** Every underlying notification id this row represents — 1 for anything
   *  that isn't a collapsed chat_message group. Read/delete act on all of
   *  them at once so a hidden older message never "resurfaces". */
  ids: string[]
  latest: AppNotification
  unread: boolean
}

// chat_message notifications from the same conversation (same `link`)
// collapse into one row showing only the newest — everything else stays
// one row per notification, same as before.
const groups = computed<DisplayGroup[]>(() => {
  const sorted = [...notificationStore.notifications].sort((a, b) => b.createdAt - a.createdAt)
  const messageGroupByLink = new Map<string, DisplayGroup>()
  const result: DisplayGroup[] = []

  for (const n of sorted) {
    if (n.type === 'chat_message' && n.link) {
      const existing = messageGroupByLink.get(n.link)
      if (existing) {
        existing.ids.push(n.id)
        existing.unread = existing.unread || !n.read
        continue
      }
      const group: DisplayGroup = { key: n.link, ids: [n.id], latest: n, unread: !n.read }
      messageGroupByLink.set(n.link, group)
      result.push(group)
    } else {
      result.push({ key: n.id, ids: [n.id], latest: n, unread: !n.read })
    }
  }
  return result
})

async function handleOpen(group: DisplayGroup): Promise<void> {
  if (group.unread) await notificationStore.markManyAsRead(group.ids)
  if (group.latest.link) router.push(group.latest.link)
}

async function handleMarkAllRead(): Promise<void> {
  await notificationStore.markAllAsRead()
}

async function handleClearAll(): Promise<void> {
  if (groups.value.length === 0) return
  if (!window.confirm('清除全部通知？此操作無法復原。')) return
  await notificationStore.clearAll()
}

// --- Swipe-right-to-reveal-delete — one row open at a time. A pointer drag
// that moves more than a few px suppresses the row's own click (so releasing
// the swipe doesn't also "open" the notification underneath it).
const REVEAL_WIDTH = 72
const openKey = ref<string | null>(null)
const drag = reactive({ key: null as string | null, startX: 0, baseOffset: 0, offset: 0 })
let dragMoved = false

function offsetFor(key: string): number {
  if (drag.key === key) return drag.offset
  return openKey.value === key ? REVEAL_WIDTH : 0
}

function onPointerDown(key: string, event: PointerEvent): void {
  drag.key = key
  drag.startX = event.clientX
  drag.baseOffset = openKey.value === key ? REVEAL_WIDTH : 0
  drag.offset = drag.baseOffset
  dragMoved = false
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(key: string, event: PointerEvent): void {
  if (drag.key !== key) return
  const raw = drag.baseOffset + (event.clientX - drag.startX)
  drag.offset = Math.min(REVEAL_WIDTH, Math.max(0, raw))
  if (Math.abs(event.clientX - drag.startX) > 6) dragMoved = true
}

function endDrag(key: string): void {
  if (drag.key !== key) return
  openKey.value = drag.offset > REVEAL_WIDTH / 2 ? key : null
  drag.key = null
  drag.offset = 0
}

function handleRowClick(group: DisplayGroup): void {
  if (dragMoved) {
    dragMoved = false
    return
  }
  if (openKey.value === group.key) {
    openKey.value = null
    return
  }
  void handleOpen(group)
}

async function handleDelete(group: DisplayGroup): Promise<void> {
  openKey.value = null
  await notificationStore.deleteMany(group.ids)
}
</script>

<template>
  <div>
    <AppHeader title="通知" back>
      <template #right>
        <div class="header-actions">
          <button v-if="notificationStore.unreadCount > 0" class="text-btn" @click="handleMarkAllRead">
            全部已讀
          </button>
          <button v-if="groups.length > 0" class="text-btn danger" @click="handleClearAll">
            清除全部
          </button>
        </div>
      </template>
    </AppHeader>

    <div class="content">
      <p v-if="!notificationStore.loaded" class="state-text">載入中...</p>
      <EmptyState
        v-else-if="groups.length === 0"
        :icon="Bell"
        title="還沒有通知"
        description="有新的訊息、收藏、留言或系統公告時，會顯示在這裡。"
      />
      <div v-else class="list">
        <div v-for="group in groups" :key="group.key" class="swipe-wrap">
          <button class="delete-action" aria-label="刪除通知" @click="handleDelete(group)">
            <Trash2 :size="18" color="#fff" />
          </button>
          <button
            class="row"
            :class="{ unread: group.unread }"
            :style="{ transform: `translateX(${offsetFor(group.key)}px)` }"
            @pointerdown="onPointerDown(group.key, $event)"
            @pointermove="onPointerMove(group.key, $event)"
            @pointerup="endDrag(group.key)"
            @pointercancel="endDrag(group.key)"
            @click="handleRowClick(group)"
          >
            <div class="icon-wrap">
              <component :is="ICONS[group.latest.type]" :size="18" color="var(--color-primary)" />
            </div>
            <div class="info">
              <p class="title">{{ group.latest.title }}</p>
              <p class="body">{{ group.latest.body }}</p>
              <p class="time">{{ formatRelativeTime(group.latest.createdAt) }}</p>
            </div>
            <span v-if="group.unread" class="dot" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.text-btn {
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 12.5px;
  font-weight: 700;
  padding: 0;
  white-space: nowrap;
}

.text-btn.danger {
  color: var(--color-danger);
}

.content {
  padding: var(--space-md);
}

.state-text {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
  padding: var(--space-lg) 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.swipe-wrap {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.delete-action {
  position: absolute;
  inset: 0;
  width: 72px;
  border: none;
  background: var(--color-danger);
  display: flex;
  align-items: center;
  justify-content: center;
}

.row {
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: left;
  touch-action: pan-y;
  transition: transform 0.15s ease;
}

.row.unread {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.icon-wrap {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.body {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.time {
  font-size: 11px;
  color: var(--color-text-disabled);
  margin: 4px 0 0;
}

.dot {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}
</style>
