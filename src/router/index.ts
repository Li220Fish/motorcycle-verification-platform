import { createRouter, createWebHistory } from 'vue-router'

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
      path: '/probe',
      name: 'probe',
      component: () => import('@/views/ProbeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  authStore.initialize()
  await authStore.waitUntilReady()

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
