<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { ChevronDown, X } from 'lucide-vue-next'

import StatusBadge from '@/components/common/StatusBadge.vue'
import VehicleDiagramOverview from '@/components/verification/VehicleDiagramOverview.vue'
import type { DiagramMarker } from '@/components/verification/VehicleDiagramOverview.vue'

export interface ReportItem {
  id: string
  title: string
  badgeLabel: string
  badgeTone: 'success' | 'warning' | 'neutral' | 'danger' | 'primary'
  note?: string
  /** The Trusted Backend's own judgement text (Answer.aiResult.details.note)
   *  — always shown separately from `note` (the User's own field), per
   *  every Group A/B/C/Audio spec's UI Contract: "AI 判定說明" vs "使用者
   *  補充" must never be merged into one field. */
  aiNote?: string | null
  /** OCR reading for this item's photo (currently only 儀表板里程 —
   *  functions/src/ocr/ocr.service.ts's analyzeDashboardOcr writes this onto
   *  the Evidence doc directly, not onto an Answer, so it's passed
   *  separately from aiNote rather than folded into it). */
  ocrText?: string | null
  photos?: string[]
  /** Nests this item under a sub-header when set (e.g. the Engine Audio+IMU
   *  session grouping: ENG-03/04 under "啟動檢測", etc. — spec §44: "Capture
   *  UI = 3 Session" but "Report = 6 個檢測結果", shown nested, not flat). A
   *  sub-header renders once, right before the first item carrying its
   *  label — consecutive items sharing the same label just group under it. */
  groupLabel?: string
  /** Verification v2 §36 — Optional (self-disclosure) items must be visibly
   *  distinguished from AI-verified Required items, not rendered identically
   *  (defaults true so callers that don't pass it — e.g. any future report
   *  consumer — keep today's plain look rather than silently mislabeling
   *  everything "使用者提供"). */
  required?: boolean
}

export interface ReportSection {
  id: string
  title: string
  statusLabel: string
  statusTone: 'success' | 'warning' | 'neutral' | 'danger' | 'primary'
  items: ReportItem[]
}

const props = withDefaults(
  defineProps<{
    vehicleTitle: string
    inspectedDate: string
    sections: ReportSection[]
    /** Optional — only the real per-verification report (VerificationReportView.vue)
     *  resolves these; the Marketplace mock report has no per-item answer data
     *  to roll up, so it simply doesn't pass any and the diagram card hides
     *  itself (see VehicleDiagramOverview.vue's `v-if="markers.length > 0"`). */
    diagramMarkers?: DiagramMarker[]
  }>(),
  { diagramMarkers: () => [] },
)

// Presentational only — the real report (per-verification data) and the
// Marketplace mock report (per-listing fabricated data) both feed this the
// same normalized shape so the hero/score/category-accordion UI is defined
// exactly once.
//
// Multiple sections can be open at once (a Set, not one scalar id) — tapping
// a diagram dot for an item like 引擎 (which spans 3 different sections)
// needs to open all of them together, so a single-open accordion would
// fight that. Manual header clicks just toggle their own section's presence
// in the set independently of whatever else is already open.
const expandedSectionIds = ref<Set<string>>(new Set())
function toggleSection(sectionId: string): void {
  const next = new Set(expandedSectionIds.value)
  if (next.has(sectionId)) next.delete(sectionId)
  else next.add(sectionId)
  expandedSectionIds.value = next
}

// Briefly highlights whichever item row(s) a diagram dot points at, after
// jumping the matching section(s) open — the color-coded dot alone doesn't
// say WHICH row down in the list it corresponds to once a section holds
// more than one item.
const highlightedItemIds = ref<Set<string>>(new Set())
let highlightTimer: ReturnType<typeof setTimeout> | undefined

function handleDiagramSelectItems(itemIds: string[]): void {
  const matchedSections = props.sections.filter((section) =>
    section.items.some((item) => itemIds.includes(item.id)),
  )
  if (matchedSections.length === 0) return

  const nextExpanded = new Set(expandedSectionIds.value)
  for (const section of matchedSections) nextExpanded.add(section.id)
  expandedSectionIds.value = nextExpanded

  highlightedItemIds.value = new Set(itemIds)
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => {
    highlightedItemIds.value = new Set()
  }, 1800)

  void nextTick(() => {
    const firstItemId = matchedSections[0].items.find((item) => itemIds.includes(item.id))?.id
    if (!firstItemId) return
    document
      .getElementById(`report-item-${firstItemId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

onBeforeUnmount(() => clearTimeout(highlightTimer))

const activeImageUrl = ref<string | null>(null)
function openImage(url: string): void {
  activeImageUrl.value = url
}
function closeImage(): void {
  activeImageUrl.value = null
}
</script>

<template>
  <div class="content">
    <div class="hero">
      <p class="hero-title">{{ vehicleTitle }}</p>
      <p class="hero-date">檢驗日期：{{ inspectedDate }}</p>
    </div>

    <VehicleDiagramOverview :markers="diagramMarkers" @select-items="handleDiagramSelectItems" />

    <div class="category-list">
      <div v-for="section in sections" :key="section.id" class="category-card">
        <button class="category-header" @click="toggleSection(section.id)">
          <span class="category-title">{{ section.title }}</span>
          <StatusBadge :tone="section.statusTone">{{ section.statusLabel }}</StatusBadge>
          <ChevronDown
            :size="16"
            class="chevron"
            :class="{ open: expandedSectionIds.has(section.id) }"
          />
        </button>

        <Transition name="expand">
          <div v-if="expandedSectionIds.has(section.id)" class="item-list">
            <template v-for="(item, itemIndex) in section.items" :key="item.id">
              <p
                v-if="
                  item.groupLabel && item.groupLabel !== section.items[itemIndex - 1]?.groupLabel
                "
                class="group-header"
              >
                {{ item.groupLabel }}
              </p>
              <div
                :id="`report-item-${item.id}`"
                class="item-row"
                :class="{
                  grouped: !!item.groupLabel,
                  highlighted: highlightedItemIds.has(item.id),
                }"
              >
                <div class="item-text">
                  <p class="item-title">
                    {{ item.title }}
                    <span v-if="item.required === false" class="optional-tag">使用者提供</span>
                  </p>
                  <p v-if="item.required === false" class="item-optional-note">
                    此為使用者自行揭露資訊，非 AI 核心判定。
                  </p>
                  <p v-if="item.ocrText" class="item-ocr-note">OCR 判讀里程：{{ item.ocrText }}</p>
                  <p v-if="item.aiNote" class="item-ai-note">AI 判定說明：{{ item.aiNote }}</p>
                  <p v-if="item.note" class="item-note">使用者補充：{{ item.note }}</p>
                  <div v-if="item.photos && item.photos.length > 0" class="item-photos">
                    <button
                      v-for="(photo, index) in item.photos"
                      :key="index"
                      type="button"
                      class="item-photo-thumb"
                      aria-label="查看照片"
                      @click="openImage(photo)"
                    >
                      <img :src="photo" alt="" />
                    </button>
                  </div>
                </div>
                <StatusBadge :tone="item.badgeTone">{{ item.badgeLabel }}</StatusBadge>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </div>

    <div v-if="activeImageUrl" class="lightbox-overlay" @click="closeImage">
      <img :src="activeImageUrl" class="lightbox-img" alt="" @click.stop />
      <button class="lightbox-close" aria-label="關閉" @click="closeImage">
        <X :size="22" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.hero {
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary) 0%, #1b3fae 100%);
  color: #fff;
}

.hero-title {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
}

.hero-date {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.category-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-md);
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--color-text-primary);
  text-align: left;
}

.category-title {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
}

.chevron {
  flex: 0 0 auto;
  color: var(--color-text-disabled);
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.item-list {
  border-top: 1px solid var(--color-border);
}

.group-header {
  margin: 0;
  padding: var(--space-sm) var(--space-md) 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-disabled);
  letter-spacing: 0.02em;
}

.item-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  transition: background-color 0.3s ease;
}

.item-row.highlighted {
  background-color: var(--color-primary-bg, #e8f1fd);
}

.item-row.grouped {
  padding-left: calc(var(--space-md) + var(--space-sm));
}

.item-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.item-text {
  min-width: 0;
}

.item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.optional-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  vertical-align: middle;
}

.item-optional-note {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-disabled);
  font-style: italic;
}

.item-ocr-note {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.item-ai-note {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-primary);
}

.item-note {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.item-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.item-photo-thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-background);
}

.item-photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  padding: var(--space-lg);
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-md);
}

.lightbox-close {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.18s ease,
    opacity 0.18s ease;
  max-height: 4000px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
