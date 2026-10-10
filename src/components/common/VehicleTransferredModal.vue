<script setup lang="ts">
/**
 * Forced "車輛已轉移" acknowledgment — shown from AppLayout.vue whenever the
 * signed-in user has an unread `vehicle_transferred` notification (see
 * functions/src/functions/vehicle-transfer-invite.ts /
 * transfer-vehicle-ownership.ts, both of which create one for the OLD owner
 * right after the ownership flip — that's the only place left they can
 * still be reached about it, since they lose read access to the vehicle doc
 * itself the same instant). Deliberately no backdrop-click-to-dismiss and no
 * other way to close it — only "了解" does, which marks the underlying
 * notification read so it won't show again (and, if more than one vehicle
 * was transferred while the user was away, the next one takes its place).
 */
defineProps<{ title: string; body: string }>()
defineEmits<{ ack: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="backdrop">
      <div class="card">
        <h3>{{ title }}</h3>
        <p>{{ body }}</p>
        <button class="ack-button" @click="$emit('ack')">了解</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  z-index: 200;
}

.card {
  width: 100%;
  max-width: 320px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  text-align: center;
}

.card h3 {
  font-size: 17px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.card p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.ack-button {
  margin-top: var(--space-sm);
  height: 44px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}
</style>
