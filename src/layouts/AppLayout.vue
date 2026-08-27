<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const router = useRouter()

const navItems = [
  { path: '/dashboard', label: 'Home' },
  { path: '/vehicles', label: 'Vehicles' },
  { path: '/verification', label: 'Verify' },
  { path: '/probe', label: 'Probe' },
  { path: '/settings', label: 'Settings' },
]

async function handleLogout(): Promise<void> {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="app-title">Motorcycle Verification Platform</span>
      <button v-if="authStore.isAuthenticated" class="logout-button" @click="handleLogout">
        Logout
      </button>
    </header>

    <div class="app-body">
      <nav class="app-sidebar">
        <RouterLink v-for="item in navItems" :key="item.path" :to="item.path">
          {{ item.label }}
        </RouterLink>
      </nav>

      <main class="app-main">
        <RouterView />
      </main>
    </div>

    <nav class="app-bottom-nav">
      <RouterLink v-for="item in navItems" :key="item.path" :to="item.path">
        {{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #ddd;
}

.app-title {
  font-weight: 600;
}

.app-body {
  flex: 1;
  display: flex;
}

.app-sidebar {
  width: 180px;
  padding: 1rem;
  display: none;
  flex-direction: column;
  gap: 0.5rem;
  border-right: 1px solid #ddd;
}

.app-sidebar a,
.app-bottom-nav a {
  text-decoration: none;
  color: inherit;
}

.app-sidebar a.router-link-active,
.app-bottom-nav a.router-link-active {
  font-weight: 700;
}

.app-main {
  flex: 1;
  padding: 1rem;
  padding-bottom: 4.5rem;
}

.app-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 0.5rem;
  background: #fff;
  border-top: 1px solid #ddd;
}

@media (min-width: 768px) {
  .app-sidebar {
    display: flex;
  }

  .app-bottom-nav {
    display: none;
  }

  .app-main {
    padding-bottom: 1rem;
  }
}
</style>
