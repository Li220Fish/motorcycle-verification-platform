<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Bike, ShieldCheck } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import { useStorageUrl } from '@/composables/useStorageUrl'
import { formatRelativeTime } from '@/utils/format-time'
import { vehicleService } from '@/services/firebase/vehicle.service'
import { verificationService } from '@/services/firebase/verification.service'
import type { ChatMessage } from '@/services/chat/chat.types'
import type { Vehicle } from '@/types/vehicle'
import type { Verification } from '@/types/verification'

const props = defineProps<{ message: ChatMessage; mine: boolean; read: boolean }>()

const router = useRouter()
const vehicle = ref<Vehicle | null>(null)
const verification = ref<Verification | null>(null)

// message.imageUrl is a Storage object path for real uploads (see
// storageService.uploadChatImage) — resolved to a fresh, rules-checked URL
// here rather than bound to directly.
const imagePath = computed(() => props.message.imageUrl)
const resolvedImageUrl = useStorageUrl(imagePath)

async function loadRichContent(): Promise<void> {
  if (props.message.type === 'vehicle' && props.message.vehicleId) {
    vehicle.value = await vehicleService.get(props.message.vehicleId).catch(() => null)
  }
  if (props.message.type === 'verification_report' && props.message.verificationId) {
    verification.value = await verificationService
      .get(props.message.verificationId)
      .catch(() => null)
  }
}

onMounted(loadRichContent)
watch(() => props.message.id, loadRichContent)
</script>

<template>
  <div class="wrap" :class="{ mine }">
    <template v-if="message.type === 'system'">
      <div class="system-note">{{ message.text }}</div>
    </template>

    <template v-else-if="message.type === 'image'">
      <div class="bubble image-bubble" :class="mine ? 'mine' : 'them'">
        <img v-if="resolvedImageUrl" :src="resolvedImageUrl" alt="聊天圖片" />
      </div>
    </template>

    <template v-else-if="message.type === 'vehicle'">
      <button
        class="bubble rich-card"
        :class="mine ? 'mine' : 'them'"
        @click="vehicle && router.push(`/vehicles/${vehicle.id}`)"
      >
        <span class="rich-icon"><Bike :size="18" /></span>
        <span class="rich-body">
          <span class="rich-title">{{
            vehicle ? `${vehicle.brand} ${vehicle.model}` : '車輛資訊'
          }}</span>
          <span class="rich-sub">{{ vehicle?.manufactureYear ?? '' }} · 點擊查看車輛</span>
        </span>
      </button>
    </template>

    <template v-else-if="message.type === 'verification_report'">
      <button
        class="bubble rich-card"
        :class="mine ? 'mine' : 'them'"
        @click="verification && router.push(`/verification/${verification.id}/report`)"
      >
        <span class="rich-icon"><ShieldCheck :size="18" /></span>
        <span class="rich-body">
          <span class="rich-title">MotoVerify 驗證報告</span>
          <span class="rich-sub">{{
            verification?.status === 'completed' ? '已完成 · 點擊查看' : '點擊查看報告'
          }}</span>
        </span>
      </button>
    </template>

    <template v-else>
      <div class="bubble" :class="mine ? 'mine' : 'them'">{{ message.text }}</div>
    </template>

    <span v-if="message.type !== 'system'" class="meta">
      {{ formatRelativeTime(message.createdAt) }}<span v-if="mine && read"> · 已讀</span>
    </span>
  </div>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  max-width: 100%;
}

.wrap.mine {
  align-items: flex-end;
  align-self: flex-end;
}

.bubble {
  max-width: 76%;
  padding: 9px 13px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  border: none;
  text-align: left;
}

.bubble.them {
  background: var(--color-background);
  color: var(--color-text-primary);
  border-bottom-left-radius: 5px;
}

.bubble.mine {
  background: var(--color-primary);
  color: #fff;
  border-bottom-right-radius: 5px;
}

.bubble.mine:not(.image-bubble):not(.rich-card) {
  max-width: 40vw;
}

.image-bubble {
  padding: 4px;
}

.image-bubble img {
  max-width: 220px;
  max-height: 260px;
  border-radius: 12px;
  display: block;
}

.rich-card {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.rich-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bubble.them .rich-icon {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.rich-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rich-title {
  font-size: 13px;
  font-weight: 700;
}

.rich-sub {
  font-size: 11px;
  opacity: 0.85;
}

.meta {
  font-size: 10px;
  color: var(--color-text-disabled);
  padding: 0 4px;
}

.system-note {
  align-self: center;
  font-size: 11.5px;
  color: var(--color-text-secondary);
  background: var(--color-background);
  padding: 5px 12px;
  border-radius: 999px;
}
</style>
