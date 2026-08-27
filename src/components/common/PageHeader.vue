<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="page-header">
    <h1>{{ title }}</h1>
    <p v-if="description" class="description">{{ description }}</p>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 1.25rem;
}

.description {
  color: #666;
  margin-top: 0.25rem;
}
</style>
