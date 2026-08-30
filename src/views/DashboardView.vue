<script setup lang="ts">
import { computed, onMounted } from 'vue'

import AppHeader from '@/components/common/AppHeader.vue'
import Logo from '@/components/common/Logo.vue'
import BuyerHomeContent from '@/components/home/BuyerHomeContent.vue'
import ProfessionalHomeContent from '@/components/home/ProfessionalHomeContent.vue'
import RoleSelection from '@/components/home/RoleSelection.vue'
import RoleSwitcher from '@/components/home/RoleSwitcher.vue'
import SellerHomeContent from '@/components/home/SellerHomeContent.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUserPreferenceStore } from '@/stores/user-preference.store'
import type { UserUsageRole } from '@/types/user-preference'

const authStore = useAuthStore()
const preferenceStore = useUserPreferenceStore()

const currentRole = computed(() => preferenceStore.currentRole)

async function handleSelectRole(role: UserUsageRole): Promise<void> {
  if (!authStore.user) return
  await preferenceStore.setRole(authStore.user.id, role)
}

onMounted(async () => {
  if (authStore.user) await preferenceStore.load(authStore.user.id)
})
</script>

<template>
  <RoleSelection v-if="!currentRole" @select="handleSelectRole" />

  <div v-else class="home">
    <AppHeader>
      <template #left>
        <div class="header-left">
          <Logo />
          <RoleSwitcher :current-role="currentRole" @select="handleSelectRole" />
        </div>
      </template>
    </AppHeader>

    <Transition name="content-fade" mode="out-in">
      <BuyerHomeContent v-if="currentRole === 'buyer'" key="buyer" />
      <SellerHomeContent v-else-if="currentRole === 'seller'" key="seller" />
      <ProfessionalHomeContent v-else key="professional" />
    </Transition>
  </div>
</template>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.18s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}
</style>
