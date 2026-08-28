<script setup lang="ts">
import { ref } from 'vue'

import PhotoEvidenceCapture from './PhotoEvidenceCapture.vue'

defineProps<{
  verificationId: string
  itemId: string
}>()

const expanded = ref(false)
</script>

<template>
  <div class="issue-capture">
    <button v-if="!expanded" class="prompt" @click="expanded = true">
      是否新增照片？拍攝問題位置
    </button>
    <PhotoEvidenceCapture
      v-else
      :verification-id="verificationId"
      :item-id="itemId"
      label="問題位置"
      allow-issue-mark
      mark-as-issue-photo
    />
  </div>
</template>

<style scoped>
.issue-capture {
  padding: var(--space-sm);
  background: var(--color-warning-bg);
  border-radius: var(--radius-md);
}

.prompt {
  width: 100%;
  height: 42px;
  border: 1px dashed var(--color-warning);
  border-radius: var(--radius-sm);
  background: transparent;
  color: #9a6b0a;
  font-size: 13px;
  font-weight: 600;
}
</style>
