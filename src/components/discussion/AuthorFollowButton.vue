<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import { discussionService } from '@/services/discussion/discussion.service'

const props = defineProps<{ currentUid: string; targetUid: string }>()

const following = ref(false)
const loaded = ref(false)

async function load(): Promise<void> {
  if (props.currentUid === props.targetUid) return
  following.value = await discussionService.isFollowing(props.currentUid, props.targetUid)
  loaded.value = true
}

async function toggle(): Promise<void> {
  if (following.value) {
    await discussionService.unfollowUser(props.currentUid, props.targetUid)
    following.value = false
  } else {
    await discussionService.followUser(props.currentUid, props.targetUid)
    following.value = true
  }
}

onMounted(load)
watch(() => props.targetUid, load)
</script>

<template>
  <button
    v-if="currentUid !== targetUid && loaded"
    class="follow-btn"
    :class="{ active: following }"
    @click="toggle"
  >
    {{ following ? '追蹤中' : '＋ 追蹤' }}
  </button>
</template>

<style scoped>
.follow-btn {
  height: 30px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid var(--color-primary);
  background: var(--color-surface);
  color: var(--color-primary);
}

.follow-btn.active {
  background: var(--color-primary-bg);
}
</style>
