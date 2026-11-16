<script setup lang="ts">
import { computed } from 'vue'

/** Route shape only (no map tiles) — normalized into a 300×180 box. */
const props = defineProps<{ path: Array<[number, number]> }>()

const points = computed(() => {
  if (props.path.length < 2) return ''
  const lats = props.path.map((p) => p[0])
  const lngs = props.path.map((p) => p[1])
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const span = Math.max(maxLat - minLat, (maxLng - minLng) * Math.cos((minLat * Math.PI) / 180), 1e-6)
  return props.path
    .map(([lat, lng]) => {
      const x = 10 + (((lng - minLng) * Math.cos((minLat * Math.PI) / 180)) / span) * 280
      const y = 170 - ((lat - minLat) / span) * 160
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <svg v-if="points" viewBox="0 0 300 180" class="route" role="img" aria-label="路線">
    <polyline :points="points" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" />
  </svg>
</template>

<style scoped>
.route { width: 100%; background: var(--surface-2); border-radius: 12px; }
</style>
