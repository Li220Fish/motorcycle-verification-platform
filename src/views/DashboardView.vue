<script setup lang="ts">
import { computed } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import { platformService } from '@/services/platform/platform.service'
import { probeService } from '@/services/probe/probe.service'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

const statusItems = computed(() => [
  { label: 'Web', status: 'OK' },
  { label: 'Firebase', status: 'Configured' },
  { label: 'Authentication', status: authStore.isAuthenticated ? 'Logged in' : 'Ready' },
  { label: 'Firestore', status: 'Configured' },
  { label: 'Storage', status: 'Configured' },
  { label: 'Capacitor', status: platformService.isNative() ? 'Native' : 'Web (ready)' },
  { label: 'Voltage Probe Service', status: 'Ready' },
  { label: 'Mock Probe', status: probeService.getMode() === 'mock' ? 'Active' : 'Standby' },
])
</script>

<template>
  <section>
    <PageHeader
      title="Motorcycle Verification Platform"
      description="V0.1 technical skeleton — confirms the base architecture is wired up before verification flows are built."
    />

    <h2>System Status</h2>
    <table class="status-table">
      <tbody>
        <tr v-for="item in statusItems" :key="item.label">
          <td>{{ item.label }}</td>
          <td class="status-value">{{ item.status }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Platform</h2>
    <p>
      {{ platformService.getPlatform() }} ({{ platformService.isNative() ? 'native' : 'browser' }})
    </p>
  </section>
</template>

<style scoped>
.status-table {
  border-collapse: collapse;
  width: 100%;
  max-width: 480px;
}

.status-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.status-value {
  text-align: right;
  color: #2e7d32;
  font-weight: 600;
}
</style>
