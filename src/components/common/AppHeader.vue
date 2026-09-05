<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const props = withDefaults(
  defineProps<{
    title?: string
    back?: boolean
    /** When true, the parent's @back handler owns navigation entirely and
     *  router.back() is never called as a fallback. Needed because Vue
     *  strips a recognized emit's `onBack` listener out of $attrs, so it
     *  can't be detected implicitly — this has to be explicit. Used by the
     *  verification flow, which always wants a deterministic exit (its own
     *  Vehicle Detail page), never raw browser history. */
    customBack?: boolean
  }>(),
  { title: '', back: false, customBack: false },
)

const emit = defineEmits<{ back: [] }>()
const router = useRouter()

function handleBack(): void {
  emit('back')
  if (!props.customBack) router.back()
}
</script>

<template>
  <header class="app-header">
    <div class="left">
      <button v-if="back" class="icon-button" aria-label="Back" @click="handleBack">
        <ChevronLeft :size="22" />
      </button>
      <h1 v-if="title" class="title">{{ title }}</h1>
      <slot v-else name="left" />
    </div>
    <div class="right">
      <slot name="right" />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 18px;
  padding-top: env(safe-area-inset-top);
  background: var(--color-background);
  position: sticky;
  top: 0;
  z-index: 10;
}

.left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.icon-button:active {
  background: var(--color-surface);
}
</style>
