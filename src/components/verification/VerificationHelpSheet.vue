<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  content: string
}>()

defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sheet-backdrop" @click="$emit('close')">
      <div class="sheet" @click.stop>
        <div class="sheet-handle" />
        <h3>{{ title }}</h3>
        <p>{{ content }}</p>
        <button class="close-button" @click="$emit('close')">知道了</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: flex-end;
  z-index: 50;
}

.sheet {
  width: 100%;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  padding: var(--space-md) var(--space-lg) calc(var(--space-lg) + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: var(--color-border);
  align-self: center;
  margin-bottom: var(--space-sm);
}

.sheet h3 {
  font-size: 16px;
  font-weight: 700;
}

.sheet p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.close-button {
  margin-top: var(--space-sm);
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-weight: 600;
}
</style>
