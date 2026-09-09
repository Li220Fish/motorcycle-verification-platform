import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Unsubscribe } from 'firebase/firestore'

import { notificationService } from '@/services/firebase/notification.service'
import type { AppNotification } from '@/types/notification'

export const useNotificationStore = defineStore('notification', () => {
  const currentUid = ref<string | null>(null)
  const notifications = ref<AppNotification[]>([])
  const loaded = ref(false)

  let unsubNotifications: Unsubscribe | null = null

  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

  /** Call once per session (e.g. from AppLayout, alongside chat's own
   *  subscribeConversations) — idempotent per uid. */
  function subscribe(uid: string): void {
    if (unsubNotifications && currentUid.value === uid) return
    unsubNotifications?.()
    currentUid.value = uid
    loaded.value = false
    unsubNotifications = notificationService.subscribeNotifications(uid, (list) => {
      notifications.value = list
      loaded.value = true
    })
  }

  function stopSubscription(): void {
    unsubNotifications?.()
    unsubNotifications = null
    notifications.value = []
    loaded.value = false
  }

  async function markAsRead(notificationId: string): Promise<void> {
    if (!currentUid.value) return
    await notificationService.markAsRead(currentUid.value, notificationId)
  }

  /** Marks a specific set of ids as read — a collapsed 訊息 group's every
   *  underlying id, not just the one shown (see NotificationsView.vue). */
  async function markManyAsRead(ids: string[]): Promise<void> {
    if (!currentUid.value) return
    await notificationService.markManyAsRead(currentUid.value, ids)
  }

  async function markAllAsRead(): Promise<void> {
    if (!currentUid.value) return
    const unreadIds = notifications.value.filter((n) => !n.read).map((n) => n.id)
    await notificationService.markManyAsRead(currentUid.value, unreadIds)
  }

  async function deleteOne(notificationId: string): Promise<void> {
    if (!currentUid.value) return
    await notificationService.deleteOne(currentUid.value, notificationId)
  }

  /** Swipe-to-delete on a collapsed group removes every id it represents. */
  async function deleteMany(ids: string[]): Promise<void> {
    if (!currentUid.value) return
    await notificationService.deleteMany(currentUid.value, ids)
  }

  async function clearAll(): Promise<void> {
    if (!currentUid.value) return
    await notificationService.deleteMany(
      currentUid.value,
      notifications.value.map((n) => n.id),
    )
  }

  return {
    notifications,
    loaded,
    unreadCount,
    subscribe,
    stopSubscription,
    markAsRead,
    markManyAsRead,
    markAllAsRead,
    deleteOne,
    deleteMany,
    clearAll,
  }
})
