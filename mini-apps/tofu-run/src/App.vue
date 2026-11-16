<script setup lang="ts">
import { onMounted, ref } from 'vue'

import TofuBlock from './components/TofuBlock.vue'
import CalibrateScreen from './screens/CalibrateScreen.vue'
import HistoryScreen from './screens/HistoryScreen.vue'
import HomeScreen from './screens/HomeScreen.vue'
import ReadyScreen from './screens/ReadyScreen.vue'
import ResultScreen from './screens/ResultScreen.vue'
import RideScreen from './screens/RideScreen.vue'
import SafetyScreen from './screens/SafetyScreen.vue'
import { acceptSafety, isSafetyAccepted, loadLocalCalibration, type LocalCalibration, type RunRecord } from './services/data'
import { ensureSignedIn } from './services/firebase'

type Screen = 'loading' | 'safety' | 'home' | 'calibrate' | 'ready' | 'ride' | 'result' | 'history'

const screen = ref<Screen>('loading')
const uid = ref<string | null>(null)
const calibration = ref<LocalCalibration | null>(null)
const lastRun = ref<RunRecord | null>(null)
const startupError = ref('')

onMounted(async () => {
  calibration.value = await loadLocalCalibration()
  screen.value = (await isSafetyAccepted()) ? 'home' : 'safety'
  try {
    uid.value = (await ensureSignedIn()).uid
  } catch (error) {
    startupError.value = `無法連線到伺服器（${error instanceof Error ? error.message : error}），校正與成績會無法上傳。`
  }
})

async function handleSafetyAccepted(): Promise<void> {
  await acceptSafety()
  screen.value = 'home'
}

function handleCalibrated(saved: LocalCalibration): void {
  calibration.value = saved
  screen.value = 'home'
}

function handleFinished(run: RunRecord): void {
  lastRun.value = run
  screen.value = 'result'
}
</script>

<template>
  <div v-if="screen === 'loading'" class="screen splash">
    <TofuBlock :size="140" />
    <p class="muted">豆腐準備中…</p>
  </div>
  <SafetyScreen v-else-if="screen === 'safety'" @accept="handleSafetyAccepted" />
  <HomeScreen
    v-else-if="screen === 'home'"
    :calibration="calibration"
    :error="startupError"
    @calibrate="screen = 'calibrate'"
    @play="screen = 'ready'"
    @history="screen = 'history'"
  />
  <CalibrateScreen
    v-else-if="screen === 'calibrate'"
    :uid="uid"
    @done="handleCalibrated"
    @cancel="screen = 'home'"
  />
  <ReadyScreen
    v-else-if="screen === 'ready' && calibration"
    @go="screen = 'ride'"
    @cancel="screen = 'home'"
  />
  <RideScreen
    v-else-if="screen === 'ride' && calibration"
    :calibration="calibration"
    :uid="uid"
    @finish="handleFinished"
  />
  <ResultScreen
    v-else-if="screen === 'result' && lastRun"
    :run="lastRun"
    @home="screen = 'home'"
    @again="screen = 'ready'"
  />
  <HistoryScreen v-else-if="screen === 'history'" :uid="uid" @back="screen = 'home'" />
</template>

<style scoped>
.splash { align-items: center; justify-content: center; }
</style>
