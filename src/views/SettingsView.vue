<script setup lang="ts">
import { useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import { platformService } from '@/services/platform/platform.service'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout(): Promise<void> {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <section>
    <PageHeader title="Settings" description="Account and environment info." />

    <table class="info-table">
      <tbody>
        <tr>
          <td>Email</td>
          <td>{{ authStore.user?.email ?? 'n/a' }}</td>
        </tr>
        <tr>
          <td>Display Name</td>
          <td>{{ authStore.user?.displayName ?? 'n/a' }}</td>
        </tr>
        <tr>
          <td>Platform</td>
          <td>{{ platformService.getPlatform() }}</td>
        </tr>
      </tbody>
    </table>

    <button @click="handleLogout">Logout</button>
  </section>
</template>

<style scoped>
.info-table {
  border-collapse: collapse;
  width: 100%;
  max-width: 480px;
  margin-bottom: 1.5rem;
}

.info-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}
</style>
