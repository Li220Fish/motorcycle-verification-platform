<script setup lang="ts">
import { FileText, Trash2, Video, Volume2, Zap } from 'lucide-vue-next'

import type { VerificationEvidence } from '@/types/verification-evidence'

withDefaults(
  defineProps<{
    evidence: VerificationEvidence[]
    readonly?: boolean
  }>(),
  { readonly: false },
)

defineEmits<{ remove: [string] }>()

function displayUrl(evidence: VerificationEvidence): string | undefined {
  return evidence.remoteUrl ?? evidence.localUri
}
</script>

<template>
  <div v-if="evidence.length > 0" class="evidence-preview">
    <div v-for="item in evidence" :key="item.id" class="evidence-tile">
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
        @click="$emit('remove', item.id)"
      >
        <Trash2 :size="14" />
      </button>
      <Video v-if="item.type === 'video'" class="type-badge" :size="14" />
      <span v-if="!item.remoteUrl" class="pending-badge">上傳中</span>
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
</style>
