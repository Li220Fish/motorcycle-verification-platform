<script setup lang="ts">
/**
 * 窗格4：預覽窗格 — a thin wrapper reusing BasicHealthCheck13.vue itself
 * (rather than reimplementing its chip-rendering logic) so the admin's
 * preview and the real consumer-facing checklist can never drift apart.
 * Fed with the in-progress draft anchors from HealthCheckAnnotationEditor.vue
 * so edits show up here live, before Save is ever pressed.
 */
import BasicHealthCheck13 from '@/components/verification/BasicHealthCheck13.vue'
import type { AdminVehicleModel } from '../services/admin-data.service'
import type { HealthCheckAnchor } from '@/data/verification/basic-health-check-items'

defineProps<{
  model: AdminVehicleModel
  draftAnchors: Record<string, HealthCheckAnchor>
}>()
</script>

<template>
  <div class="preview-frame">
    <BasicHealthCheck13
      :has-chain="model.hasChain"
      :anchors-override="draftAnchors"
      :cover-image-override="model.coverImageUrl"
      preview-mode
    />
  </div>
</template>

<style scoped>
.preview-frame {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface);
  max-width: 375px;
  margin: 0 auto;
}
</style>
