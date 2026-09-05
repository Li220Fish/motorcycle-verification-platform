<script setup lang="ts">
import { FileAudio, FileJson, FileVideo, CheckCircle2 } from 'lucide-vue-next'

defineProps<{
  kind: 'audio' | 'imu' | 'video'
  filename: string
  durationSeconds: number
  sizeBytes: number
}>()

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(0)} KB`
}
</script>

<template>
  <div class="file-card">
    <div class="file-icon">
      <FileAudio v-if="kind === 'audio'" :size="20" />
      <FileVideo v-else-if="kind === 'video'" :size="20" />
      <FileJson v-else :size="20" />
    </div>
    <div class="file-info">
      <p class="file-name">{{ filename }}</p>
      <p class="file-meta">{{ formatDuration(durationSeconds) }} · {{ formatSize(sizeBytes) }}</p>
    </div>
    <CheckCircle2 class="file-check" :size="20" />
  </div>
</template>

<style scoped>
.file-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-primary);
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.file-check {
  color: var(--color-success);
  flex-shrink: 0;
}
</style>
