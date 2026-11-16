<script setup lang="ts">
import { ref } from 'vue'

defineEmits<{ accept: [] }>()
const agreed = ref(false)
</script>

<template>
  <div class="screen">
    <h1>送豆腐 🚚🧈</h1>
    <p class="muted">把手機當成一盒豆腐固定在車上，騎得越平穩，豆腐越完整。</p>
    <div class="card">
      <h2>安全守則</h2>
      <ol class="rules">
        <li>遵守交通規則與速限。這個遊戲<b>不比速度</b>，只比平穩。</li>
        <li>出發前把手機<b>固定在車上</b>（手機架或置物處），騎乘中<b>不要看、不要碰手機</b>。</li>
        <li>騎乘中只會用<b>語音</b>提醒豆腐狀況；要結束時請先<b>安全停車</b>，再長按「抵達」。</li>
        <li>天候不佳、路況危險或身體不適時請不要遊玩。</li>
      </ol>
    </div>
    <label class="agree">
      <input v-model="agreed" type="checkbox" />
      我了解並會遵守以上守則
    </label>
    <div class="spacer" />
    <button class="btn" :disabled="!agreed" @click="$emit('accept')">開始</button>
  </div>
</template>

<style scoped>
.rules { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 6px; font-size: 15px; }
.agree { display: flex; align-items: center; gap: 10px; font-size: 15px; }
.agree input { width: 22px; height: 22px; accent-color: var(--accent); }
</style>
