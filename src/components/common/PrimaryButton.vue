<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', disabled: false, block: false, type: 'button' },
)

defineEmits<{ click: [MouseEvent] }>()
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[variant, { block }]"
    :disabled="disabled"
    @click="(event) => $emit('click', event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  height: 48px;
  padding: 0 var(--space-lg);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-size: 15px;
  font-weight: 600;
  transition:
    transform 0.1s ease,
    opacity 0.15s ease;
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn.block {
  width: 100%;
}

.primary {
  background: var(--color-primary);
  color: #fff;
}

.secondary {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.danger {
  background: var(--color-danger);
  color: #fff;
}

.ghost {
  background: transparent;
  color: var(--color-primary);
  height: auto;
  padding: 0;
}
</style>
