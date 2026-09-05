import { createRouter, createWebHistory } from 'vue-router'

import { isAdminSession } from '@/admin/services/admin-auth.service'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/vehicles',
      name: 'vehicles',
      component: () => import('@/views/VehiclesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/vehicles/:id',
      name: 'vehicle-detail',
      component: () => import('@/views/VehicleDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/verification',
      name: 'verification',
      component: () => import('@/views/VerificationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/verification/:id',
      name: 'verification-steps',
      component: () => import('@/views/VerificationStepsView.vue'),
      meta: { requiresAuth: true, hideChrome: true },
      props: true,
    },
    {
      path: '/verification/:id/result',
      name: 'verification-result',
      component: () => import('@/views/VerificationResultView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/verification/:id/comparison',
      name: 'verification-comparison',
      component: () => import('@/views/VerificationComparisonView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/verification/:id/report',
      name: 'verification-report',
      component: () => import('@/views/VerificationReportView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/verification/:id/share',
      name: 'verification-share',
      component: () => import('@/views/ShareReportView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/probe',
      name: 'probe',
      component: () => import('@/views/ProbeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/marketplace',
      name: 'marketplace',
      component: () => import('@/views/MarketplaceView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/marketplace/:id',
      name: 'marketplace-listing',
      component: () => import('@/views/MarketplaceListingView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/marketplace/:id/report',
      name: 'marketplace-report',
      component: () => import('@/views/MarketplaceReportView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/views/ReportsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-listings',
      name: 'my-listings',
      component: () => import('@/views/MyListingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-listings/:id',
      name: 'my-listing-manage',
      component: () => import('@/views/MyListingManageView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/account',
      name: 'settings-account',
      component: () => import('@/views/AccountView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/notifications',
      name: 'settings-notifications',
      component: () => import('@/views/NotificationSettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/privacy',
      name: 'settings-privacy',
      component: () => import('@/views/PrivacyDataView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/about',
      name: 'settings-about',
      component: () => import('@/views/AboutView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('@/views/MessagesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/messages/:conversationId',
      name: 'chat-room',
      component: () => import('@/views/ChatRoomView.vue'),
      meta: { requiresAuth: true, hideChrome: true },
      props: true,
    },
    {
      path: '/discussion',
      name: 'discussion',
      component: () => import('@/views/DiscussionView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/discussion/compose',
      name: 'discussion-compose',
      component: () => import('@/views/DiscussionComposeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/discussion/:postId',
      name: 'discussion-post',
      component: () => import('@/views/DiscussionPostView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/vehicle-news/:newsId',
      name: 'vehicle-news',
      component: () => import('@/views/VehicleNewsView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    // --- MotoVerify 營運後台 (/admin) — see docs/admin-backend.md. Entirely
    // separate from the mobile app's views/components/design tokens; only
    // the Firestore `db` handle and a few read-only type contracts are
    // shared (src/admin/services/admin-data.service.ts). Auth is handled in
    // the router.beforeEach below, not via `meta.requiresAuth` — an admin
    // session is a specific Firebase Auth uid, not "any signed-in user".
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/admin/AdminLoginView.vue'),
      meta: { hideChrome: true },
    },
    {
      path: '/admin/users/:uid',
      name: 'admin-user-detail',
      component: () => import('@/admin/AdminDashboardView.vue'),
      meta: { hideChrome: true },
      props: (route) => ({ page: 'userdetail', uid: route.params.uid }),
    },
    {
      path: '/admin/verifications/:id',
      name: 'admin-verification-detail',
      component: () => import('@/admin/AdminDashboardView.vue'),
      meta: { hideChrome: true },
      props: (route) => ({ page: 'verifydetail', id: route.params.id }),
    },
    {
      path: '/admin/:page?',
      name: 'admin-dashboard',
      component: () => import('@/admin/AdminDashboardView.vue'),
      meta: { hideChrome: true },
      props: (route) => ({ page: route.params.page || 'overview' }),
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  authStore.initialize()
  await authStore.waitUntilReady()

  if (to.path.startsWith('/admin')) {
    if (to.name === 'admin-login') {
      return isAdminSession() ? { name: 'admin-dashboard' } : true
    }
    return isAdminSession() ? true : { name: 'admin-login' }
  }

  const requiresAuth = to.meta.requiresAuth !== false
  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
