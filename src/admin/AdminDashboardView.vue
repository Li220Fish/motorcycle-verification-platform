<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { auth } from '@/services/firebase/firebase'
import { listAllReports, listAllVerifications } from './services/admin-data.service'
import './admin.css'

const props = defineProps<{ page: string; uid?: string; id?: string }>()

const router = useRouter()

interface NavItem {
  key: string
  label: string
  badge?: () => number | null
}
interface NavGroup {
  title: string
  items: NavItem[]
}

const pendingVerifications = ref(0)
const pendingReports = ref<{ user: number; post: number }>({ user: 0, post: 0 })

const NAV_GROUPS: NavGroup[] = [
  { title: '總覽', items: [{ key: 'overview', label: '營運總覽' }] },
  {
    title: '個人用戶',
    items: [
      { key: 'users', label: '使用者名冊' },
      { key: 'behaviour', label: '行為與興趣' },
      { key: 'garage', label: '車庫與履歷' },
    ],
  },
  {
    title: 'App 功能管理',
    items: [
      { key: 'verify', label: '檢驗任務', badge: () => pendingVerifications.value },
      { key: 'market', label: '交易市場' },
      { key: 'messages', label: '訊息與檢舉', badge: () => pendingReports.value.user },
      { key: 'discussion', label: '討論中心', badge: () => pendingReports.value.post },
      { key: 'news', label: '車訊新知' },
      { key: 'notifications', label: '系統通知' },
      { key: 'probe', label: 'Probe 裝置' },
    ],
  },
  {
    title: '資料維護',
    items: [
      { key: 'models', label: '車輛選單資訊' },
      { key: 'healthcheck', label: '健檢標記' },
      { key: 'training', label: '訓練資料集' },
    ],
  },
  { title: '系統設定', items: [{ key: 'prompts', label: 'AI Prompt 設定' }] },
]

const TITLES: Record<string, [string, string]> = {
  overview: ['營運總覽', '尚未串接完整事件追蹤'],
  users: ['使用者名冊', 'collection: users'],
  userdetail: ['使用者詳情', 'collection: users / vehicles / marketplaceListings / verifications'],
  verifydetail: ['檢驗詳情', 'collection: verifications/{id}/answers — 含 AI 回應'],
  vehicledetail: ['車輛詳情', 'collection: vehicles/{id} / verifications'],
  behaviour: ['行為與興趣', '需要事件追蹤基礎建設'],
  garage: ['車庫與履歷', 'collection: vehicles'],
  verify: ['檢驗任務', 'collection: verifications'],
  market: ['交易市場', 'collection: marketplaceListings'],
  messages: ['訊息與檢舉', 'collection: conversations / discussionReports'],
  discussion: ['討論中心', 'collection: discussionPosts'],
  news: ['車訊新知', 'collection: vehicleNews'],
  notifications: ['系統通知', 'collection: systemAnnouncements（廣播給所有使用者）'],
  probe: ['Probe 裝置', 'collection: voltageSessions（目前無寫入來源）'],
  models: ['車輛選單資訊', 'collection: vehicleModels'],
  healthcheck: ['健檢標記', 'collection: vehicleModels（healthCheckAnchors 欄位）'],
  training: ['訓練資料集', 'collection: trainingCaptures / trainingSessions / dataCollectors — YOLO26-OBB'],
  prompts: ['AI Prompt 設定', 'collection: aiPrompts（新建，覆寫 functions 端預設值）'],
}

const activeKey = computed(() => props.page || 'overview')
const title = computed(() => TITLES[activeKey.value]?.[0] ?? '找不到頁面')
const crumb = computed(() => TITLES[activeKey.value]?.[1] ?? '')

const SECTION_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  overview: () => import('./sections/OverviewSection.vue'),
  users: () => import('./sections/UsersSection.vue'),
  userdetail: () => import('./sections/UserDetailSection.vue'),
  verifydetail: () => import('./sections/VerifyDetailSection.vue'),
  vehicledetail: () => import('./sections/VehicleDetailSection.vue'),
  behaviour: () => import('./sections/BehaviourSection.vue'),
  garage: () => import('./sections/GarageSection.vue'),
  verify: () => import('./sections/VerifySection.vue'),
  market: () => import('./sections/MarketSection.vue'),
  messages: () => import('./sections/MessagesSection.vue'),
  discussion: () => import('./sections/DiscussionSection.vue'),
  news: () => import('./sections/NewsSection.vue'),
  notifications: () => import('./sections/NotificationsSection.vue'),
  probe: () => import('./sections/ProbeSection.vue'),
  models: () => import('./sections/ModelsSection.vue'),
  healthcheck: () => import('./sections/HealthCheckSection.vue'),
  training: () => import('./sections/TrainingDatasetSection.vue'),
  prompts: () => import('./sections/PromptsSection.vue'),
}

const sectionComponent = computed(() => {
  const loader = SECTION_LOADERS[activeKey.value]
  return loader ? defineAsyncComponent(loader) : null
})

function goTo(key: string): void {
  router.push(key === 'overview' ? { name: 'admin-dashboard', params: {} } : `/admin/${key}`)
}

function handleUserClick(uid: string): void {
  router.push(`/admin/users/${uid}`)
}

async function loadBadges(): Promise<void> {
  const [verifications, reports] = await Promise.all([listAllVerifications(), listAllReports()])
  pendingVerifications.value = verifications.filter(
    (v) => v.status === 'needs_review' || v.status === 'in_progress',
  ).length
  const pending = reports.filter((r) => r.status === 'pending')
  pendingReports.value = {
    user: pending.filter((r) => r.targetType === 'user').length,
    post: pending.filter((r) => r.targetType === 'post' || r.targetType === 'comment').length,
  }
}

function handleLogout(): void {
  auth.signOut()
  router.push({ name: 'admin-login' })
}

onMounted(loadBadges)
watch(activeKey, loadBadges)
</script>

<template>
  <div class="admin-root">
    <div class="admin-shell">
      <nav class="admin-rail">
        <div class="admin-brand">
          <div class="admin-brand-mark">
            <svg viewBox="0 0 618 618">
              <rect width="618" height="618" fill="#2C4BEA" />
              <g transform="translate(-28,-10)">
                <path
                  d="M295.2,327.7 A70,70 0 1 0 308.6,430"
                  fill="none"
                  stroke="#FFFFFF"
                  stroke-width="50"
                />
                <path
                  d="M155,158 H380 C437,158 482,200 482,252 C482,300 445,338 395,345 L520,472 L448,474 L265,380 L340,282 H378 C398,282 410,268 410,252 C410,236 398,220 378,220 H208 Z"
                  fill="#FFFFFF"
                  stroke="#2C4BEA"
                  stroke-width="14"
                  stroke-linejoin="miter"
                  paint-order="stroke"
                />
              </g>
            </svg>
          </div>
          <div>
            <div class="admin-brand-name">RiDE</div>
            <div class="admin-brand-sub">營運後台</div>
          </div>
        </div>

        <div v-for="group in NAV_GROUPS" :key="group.title" class="admin-nav-group">
          <h3>{{ group.title }}</h3>
          <button
            v-for="item in group.items"
            :key="item.key"
            class="admin-nav-item"
            :class="{ active: activeKey === item.key }"
            @click="goTo(item.key)"
          >
            <span class="admin-nav-label">{{ item.label }}</span>
            <span
              v-if="item.badge && item.badge()"
              class="admin-nav-count"
              :class="{ hot: item.badge()! > 0 }"
              >{{ item.badge() }}</span
            >
          </button>
        </div>
      </nav>

      <div class="admin-main">
        <header class="admin-topbar">
          <div>
            <h1>{{ title }}</h1>
            <div class="admin-crumb">{{ crumb }}</div>
          </div>
          <div class="admin-topbar-spacer"></div>
          <div class="admin-op">當班：<b>RiDE 管理員</b>，平台管理員</div>
          <button class="admin-logout" @click="handleLogout">登出</button>
        </header>

        <section class="admin-page">
          <component
            :is="sectionComponent"
            v-if="sectionComponent"
            :id="id"
            :uid="uid"
            @open-user="handleUserClick"
          />
          <p v-else class="admin-page-intro">找不到這個後台頁面。</p>
        </section>
      </div>
    </div>
  </div>
</template>
