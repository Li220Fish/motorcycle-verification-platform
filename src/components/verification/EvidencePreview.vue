<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { FileText, Trash2, Video, Volume2, X, Zap } from 'lucide-vue-next'

import { storageService } from '@/services/firebase/storage.service'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = withDefaults(
  defineProps<{
    evidence: VerificationEvidence[]
    readonly?: boolean
  }>(),
  { readonly: false },
)

defineEmits<{ remove: [string] }>()

// evidence.remoteUrl is a Storage object path for real uploads (see
// storageService.uploadEvidenceFile) — resolved to fresh, rules-checked URLs
// here, keyed by evidence id, rather than bound to directly. A v-for of
// tiles needs a resolved-URL-per-item map since useStorageUrl only tracks a
// single path.
const resolvedUrls = reactive<Record<string, string>>({})

async function resolveOne(item: VerificationEvidence): Promise<void> {
  const path = item.remoteUrl
  if (!path) return
  if (/^https?:\/\//.test(path)) {
    resolvedUrls[item.id] = path
    return
  }
  try {
    resolvedUrls[item.id] = await storageService.resolveDownloadUrl(path)
  } catch {
    delete resolvedUrls[item.id]
  }
}

watch(
  () => props.evidence,
  (items) => {
    for (const item of items) {
      if (item.remoteUrl && !(item.id in resolvedUrls)) void resolveOne(item)
    }
  },
  { immediate: true },
)

function displayUrl(evidence: VerificationEvidence): string | undefined {
  return resolvedUrls[evidence.id] ?? evidence.localUri
}

// Tap a photo/video tile to view it enlarged — revisiting an already-
// answered item only ever showed an 84x84 thumbnail with no way to check
// detail. Icon-only tiles (audio/voltage/document) have nothing to zoom.
const zoomedItem = ref<VerificationEvidence | null>(null)

function openZoom(item: VerificationEvidence): void {
  if (item.type === 'photo' || item.type === 'video') zoomedItem.value = item
}

function closeZoom(): void {
  zoomedItem.value = null
}
</script>

<template>
  <div v-if="evidence.length > 0" class="evidence-preview">
    <div
      v-for="item in evidence"
      :key="item.id"
      class="evidence-tile"
      :class="{ zoomable: item.type === 'photo' || item.type === 'video' }"
      @click="openZoom(item)"
    >
      <img
        v-if="item.type === 'photo' && displayUrl(item)"
        :src="displayUrl(item)"
        alt="Evidence photo"
      />
      <video v-else-if="item.type === 'video' && displayUrl(item)" :src="displayUrl(item)" muted />
      <div v-else class="icon-tile">
        <Volume2 v-if="item.type === 'audio'" :size="22" />
        <Zap v-else-if="item.type === 'voltage'" :size="22" />
        <FileText v-else :size="22" />
      </div>
      <button
        v-if="!readonly"
        class="remove-button"
        aria-label="Remove evidence"
        @click.stop="$emit('remove', item.id)"
      >
        <Trash2 :size="14" />
      </button>
      <Video v-if="item.type === 'video'" class="type-badge" :size="14" />
      <span v-if="!item.remoteUrl" class="pending-badge">上傳中</span>
    </div>

    <div v-if="zoomedItem" class="zoom-overlay" @click="closeZoom">
      <button class="zoom-close" aria-label="關閉" @click="closeZoom"><X :size="20" /></button>
      <img
        v-if="zoomedItem.type === 'photo'"
        :src="displayUrl(zoomedItem)"
        alt="Evidence photo enlarged"
        class="zoom-media"
        @click.stop
      />
      <video
        v-else-if="zoomedItem.type === 'video'"
        :src="displayUrl(zoomedItem)"
        class="zoom-media"
        controls
        autoplay
        playsinline
        @click.stop
      />
    </div>
  </div>
</template>

<style scoped>
.evidence-preview {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.evidence-tile {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-background);
}

.evidence-tile img,
.evidence-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-tile {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-disabled);
}

.remove-button {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: none;
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-badge {
  position: absolute;
  bottom: 3px;
  left: 3px;
  color: #fff;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.6));
}

.pending-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.7);
  color: #fff;
}

.evidence-tile.zoomable {
  cursor: zoom-in;
}

.zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
}

.zoom-media {
  max-width: 92vw;
  max-height: 85vh;
  border-radius: var(--radius-md);
}

.zoom-close {
  position: absolute;
  top: max(var(--space-md), env(safe-area-inset-top));
  right: var(--space-md);
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
