import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { broadcastNotification } from '../../services/notification.service'

interface VehicleNewsDoc {
  title: string
}

export const onVehicleNewsCreated = onDocumentCreated('vehicleNews/{newsId}', async (event) => {
  const news = event.data?.data() as VehicleNewsDoc | undefined
  if (!news) return

  const { newsId } = event.params
  await broadcastNotification({
    type: 'vehicle_news',
    title: '車訊新知',
    body: news.title,
    link: `/vehicle-news/${newsId}`,
  })
})
