<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bike, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import { useI18n } from '@/composables/useI18n'
import { vehicleModelService } from '@/services/firebase/vehicle-model.service'
import type { VehicleModelProfile } from '@/services/firebase/vehicle-model.service'

const router = useRouter()
const { t } = useI18n()

const models = ref<VehicleModelProfile[]>([])
const loading = ref(true)
const searchQuery = ref('')

function modelDisplayName(model: VehicleModelProfile): string {
  return [model.brand, model.series, model.trimName].filter(Boolean).join(' ')
}

const filteredModels = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return models.value
  return models.value.filter((model) => {
    const haystack = [model.brand, model.series, model.trimName, ...model.synonyms]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
})

function openModel(model: VehicleModelProfile): void {
  router.push(`/discussion/vehicle-knowledge/${model.id}`)
}

onMounted(async () => {
  models.value = await vehicleModelService.listProfiles().catch(() => [])
  loading.value = false
})
</script>

<template>
  <div class="section">
    <div class="search-box">
      <Search :size="16" color="var(--color-text-disabled)" />
      <input v-model="searchQuery" :placeholder="t('vehicleKnowledge', 'searchPlaceholder')" />
    </div>

    <p v-if="loading" class="loading">{{ t('vehicleKnowledge', 'loading') }}</p>
    <EmptyState
      v-else-if="models.length === 0"
      :icon="Bike"
      :title="t('vehicleKnowledge', 'emptyTitle')"
      :description="t('vehicleKnowledge', 'emptyDesc')"
    />
    <EmptyState
      v-else-if="filteredModels.length === 0"
      :icon="Search"
      :title="t('vehicleKnowledge', 'noMatchTitle')"
      :description="t('vehicleKnowledge', 'noMatchDesc')"
    />
    <div v-else class="list">
      <button
        v-for="model in filteredModels"
        :key="model.id"
        class="entry-card"
        @click="openModel(model)"
      >
        <div class="thumb">
          <img v-if="model.coverImageUrl" :src="model.coverImageUrl" alt="" />
          <Bike v-else :size="26" color="var(--color-text-disabled)" />
        </div>
        <div class="entry-title-block">
          <p class="entry-title">{{ modelDisplayName(model) }}</p>
          <p class="entry-year">
            {{
              model.modelYear
                ? t('vehicleKnowledge', 'modelYear', { year: model.modelYear })
                : t('vehicleKnowledge', 'unknownYear')
            }}
          </p>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 42px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.search-box input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-text-primary);
}

.loading {
  text-align: center;
  color: var(--color-text-disabled);
  padding: var(--space-lg) 0;
  margin: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.entry-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  font-family: inherit;
  color: var(--color-text-primary);
  text-align: left;
}

.thumb {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry-title-block {
  flex: 1;
  min-width: 0;
}

.entry-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-year {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
