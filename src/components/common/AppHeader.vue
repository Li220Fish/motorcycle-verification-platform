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
  /* min-height, not height — with the project-wide `box-sizing: border-box`
     reset, a fixed `height` makes `padding-top` eat into that same fixed
     box instead of growing it, so on a device with a real inset (a notch/
     pill cutout) this header's actual rendered height never exceeds
     --header-height no matter the inset. Every sticky bar that stacks
     below this one (e.g. VerificationCategoryNav.vue's .category-nav)
     positions itself via `top: calc(var(--header-height) + <the same inset
     below>)`, i.e. already assumes this header IS that tall — min-height
     (grows to fit the padding) is what actually makes that true. Found
     live on a real device (40px inset): the mismatch left a 40px gap
     between this header and the next sticky bar with no opaque element
     covering it, through which normally-scrolling content behind both bars
     became briefly visible while passing through.

     padding-top below reads `var(--safe-area-inset-top, env(...))` rather
     than plain `env(safe-area-inset-top)` — Capacitor's Android WebView
     does NOT support the standard CSS env() safe-area variables at all
     (only iOS/WebKit does); Capacitor 8's built-in SystemBars plugin
     instead injects the inset as a `--safe-area-inset-*` CSS custom
     property on <html> (see node_modules/@capacitor/android/capacitor/src/
     main/java/com/getcapacitor/plugin/SystemBars.java). This pattern (var()
     preferring the injected property, falling back to env() for iOS/plain
     web) is used everywhere this app reads a safe-area inset — found live
     on a real Android 15+ device (targetSdk 36 enforces edge-to-edge,
     unlike older Android which let the OS reserve the status bar's space
     automatically): content sat flush under the status bar with zero top
     padding, since env() alone silently resolves to 0 on Android. */
  min-height: var(--header-height);
  padding: 0 18px;
  padding-top: var(--safe-area-inset-top, env(safe-area-inset-top));
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
