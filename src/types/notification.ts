export type NotificationType =
  | 'chat_message'
  | 'listing_favorited'
  | 'booking_request'
  | 'system'
  | 'vehicle_news'
  | 'discussion_featured'
  | 'discussion_admin_post'
  | 'discussion_comment'
  | 'discussion_like'
  | 'discussion_reply'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: number
}
