<script setup lang="ts">
import { computed, ref, watch, type ComponentPublicInstance } from 'vue'
import { Check, ChevronDown, Lock } from 'lucide-vue-next'

import type { VerificationSection } from '@/data/verification'

const props = defineProps<{
  sections: VerificationSection[]
  currentItemId: string
  answeredIds: string[]
}>()

const emit = defineEmits<{ selectSection: [string]; selectItem: [string] }>()

const answeredSet = computed(() => new Set(props.answeredIds))
const listOpen = ref(false)
const tabRefs = ref<Record<string, HTMLButtonElement | undefined>>({})

function setTabRef(sectionId: string, el: Element | ComponentPublicInstance | null): void {
  tabRefs.value[sectionId] = (el as HTMLButtonElement | null) ?? undefined
}

const activeSection = computed(
  () =>
    props.sections.find((section) => section.items.some((it) => it.id === props.currentItemId)) ??
    props.sections[0],
)

// Buyer's 6 tabs can overflow the 4-visible-at-a-time scroll row — jumping
// into an off-screen category (e.g. via Next, or Review's "jump to missing
// item") should bring its tab into view instead of leaving it scrolled away.
watch(activeSection, (section) => {
  if (!section) return
  tabRefs.value[section.id]?.scrollIntoView({
    behavior: 'smooth',
    inline: 'nearest',
    block: 'nearest',
  })
})

const currentItem = computed(
  () => activeSection.value?.items.find((it) => it.id === props.currentItemId) ?? null,
)

// Collapse the item list whenever the active category changes so switching
// tabs never leaves a stale list open under a different section.
watch(activeSection, () => {
  listOpen.value = false
})

function sectionDone(section: VerificationSection): number {
  return section.items.filter((it) => answeredSet.value.has(it.id)).length
}

function selectSection(section: VerificationSection): void {
  listOpen.value = false
  emit('selectSection', section.id)
}

function selectItem(itemId: string): void {
  listOpen.value = false
  emit('selectItem', itemId)
}
</script>

<template>
  <div class="category-nav">
    <div class="tabs">
      <button
        v-for="section in sections"
        :key="section.id"
        :ref="(el) => setTabRef(section.id, el)"
        class="tab"
        :class="{ active: section.id === activeSection?.id }"
        @click="selectSection(section)"
      >
        <span class="tab-title">{{ section.title }}</span>
        <span class="tab-count">{{ sectionDone(section) }}/{{ section.items.length }}</span>
      </button>
    </div>

    <button
      v-if="activeSection"
      class="item-toggle"
      :class="{ locked: activeSection.lockedOrder }"
      @click="activeSection.lockedOrder ? undefined : (listOpen = !listOpen)"
    >
      <Lock v-if="activeSection.lockedOrder" :size="13" />
      <span class="item-toggle-label">{{ currentItem?.title ?? activeSection.title }}</span>
      <span v-if="activeSection.lockedOrder" class="item-toggle-hint">依序完成，不可跳步</span>
      <ChevronDown v-else :size="16" class="chevron" :class="{ open: listOpen }" />
    </button>

    <Transition name="list-collapse">
      <div v-if="listOpen && activeSection && !activeSection.lockedOrder" class="item-list">
        <button
          v-for="stepItem in activeSection.items"
          :key="stepItem.id"
          class="item-row"
          :class="{ active: stepItem.id === currentItemId }"
          @click="selectItem(stepItem.id)"
        >
          <span class="row-status" :class="{ done: answeredSet.has(stepItem.id) }">
            <Check v-if="answeredSet.has(stepItem.id)" :size="12" />
          </span>
          <span class="row-title">{{ stepItem.title }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.category-nav {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: calc(var(--header-height) + env(safe-area-inset-top));
  z-index: 5;
}

/* Single scrollable row, sized to show exactly 4 tabs at a time — Seller's 4
   categories fill it exactly with no scrolling; Buyer's 6 (same 4 + 上路 +
   熱車檢查) overflow and swipe horizontally instead of wrapping to a 2nd row
   or being squeezed into illegible fractional columns. */
.tabs {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 2px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  flex: 0 0 25%;
  min-width: 0;
  scroll-snap-align: start;
}

.tab-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-count {
  font-size: 10px;
  opacity: 0.8;
}

.item-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px var(--space-md);
  border: none;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
}

.item-toggle.locked {
  color: var(--color-text-disabled);
}

.item-toggle-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-toggle-hint {
  font-size: 11px;
  font-weight: 500;
  flex: 0 0 auto;
}

.chevron {
  flex: 0 0 auto;
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.item-list {
  max-height: 46vh;
  overflow-y: auto;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px var(--space-md);
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-primary);
  font-size: 14px;
  text-align: left;
}

.item-row.active {
  background: var(--color-primary-bg, #e8f1fd);
  color: var(--color-primary);
  font-weight: 700;
}

.row-status {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1.5px solid var(--color-border);
  color: #fff;
}

.row-status.done {
  background: var(--color-success);
  border-color: var(--color-success);
}

.row-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-collapse-enter-active,
.list-collapse-leave-active {
  transition:
    max-height 0.18s ease,
    opacity 0.18s ease;
}

.list-collapse-enter-from,
.list-collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
