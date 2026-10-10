import { reactive, ref } from 'vue'

export type TapConfirmResult = 'pass' | 'fail' | undefined

const LONG_PRESS_MS = 450

/**
 * Shared tap/long-press confirm gesture — a quick tap marks 打勾(pass)
 * directly (the common case, tapping again clears back to unanswered); a
 * long-press (450ms) opens a floating 打勾/打叉 picker to explicitly choose
 * either, same "like FB's long-press-for-reactions" idea either way.
 *
 * Extracted from BasicHealthCheck13.vue (which still owns its own photo-
 * marker-chip rendering — this only holds the gesture/state machine) so
 * BuyerDisclosureCheck.vue's plain list-row UI can reuse the exact same
 * interaction without a second, independently-maintained copy of the same
 * long-press logic. `state` starts empty and gains keys on demand (a Vue 3
 * reactive() Proxy tracks new property additions correctly), so callers
 * with a dynamic/async item list (BuyerDisclosureCheck.vue) never need to
 * know the full key set up front the way BasicHealthCheck13.vue's fixed
 * BASIC-* items do.
 */
export function useTapConfirmItem(onResult: (key: string, value: 'pass' | 'fail') => void) {
  const state = reactive<Record<string, TapConfirmResult>>({})
  /** Which item's 打勾/打叉 picker is currently open, or null when closed. */
  const pickerKey = ref<string | null>(null)

  let longPressTimer: ReturnType<typeof setTimeout> | undefined
  let longPressTriggered = false

  function clearLongPressTimer(): void {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = undefined
    }
  }

  function handlePointerDown(key: string): void {
    longPressTriggered = false
    clearLongPressTimer()
    longPressTimer = setTimeout(() => {
      longPressTriggered = true
      pickerKey.value = key
      navigator.vibrate?.(15)
    }, LONG_PRESS_MS)
  }

  function handlePointerUpOrLeave(): void {
    clearLongPressTimer()
  }

  /** Quick tap (short press, no picker shown): first tap marks 打勾／正常
   *  directly. Tapping again clears it back to unanswered (a pure local
   *  "let me reconsider" gesture, not persisted — same as
   *  BasicHealthCheck13.vue's own original behavior). */
  function handleClick(key: string): void {
    if (longPressTriggered) {
      longPressTriggered = false
      return
    }
    if (state[key] === undefined) {
      state[key] = 'pass'
      onResult(key, 'pass')
    } else {
      state[key] = undefined
    }
  }

  function pick(key: string, value: 'pass' | 'fail'): void {
    state[key] = value
    pickerKey.value = null
    onResult(key, value)
  }

  function closePicker(): void {
    pickerKey.value = null
  }

  return {
    state,
    pickerKey,
    handlePointerDown,
    handlePointerUpOrLeave,
    handleClick,
    pick,
    closePicker,
  }
}
