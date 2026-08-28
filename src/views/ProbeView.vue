<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Bluetooth, ChevronLeft, HelpCircle } from 'lucide-vue-next'

import PrimaryButton from '@/components/common/PrimaryButton.vue'
import ProbeStatusCard from '@/components/probe/ProbeStatusCard.vue'
import VoltageChart from '@/components/probe/VoltageChart.vue'
import VoltageMetric from '@/components/probe/VoltageMetric.vue'
import { useBluetoothStore } from '@/stores/bluetooth.store'
import { useProbeStore } from '@/stores/probe.store'

const probeStore = useProbeStore()
const bluetoothStore = useBluetoothStore()

const connecting = ref(false)
const errorMessage = ref('')
const showHelp = ref(false)
const showDevices = ref(false)

const isMockMode = () => probeStore.mode === 'mock'

function toggleMode(): void {
  probeStore.setMode(isMockMode() ? 'ble' : 'mock')
}

async function handleSearch(): Promise<void> {
  errorMessage.value = ''
  connecting.value = true
  try {
    await probeStore.connect()
    await probeStore.start()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '搜尋裝置失敗'
  } finally {
    connecting.value = false
  }
}

async function handleStopMonitoring(): Promise<void> {
  await probeStore.stop()
  await probeStore.disconnect()
}

async function toggleScan(): Promise<void> {
  if (bluetoothStore.scanning) {
    await bluetoothStore.stopScan()
  } else {
    await bluetoothStore.startScan()
  }
}

onMounted(() => {
  bluetoothStore.checkEnabled()
  bluetoothStore.refreshBondedDevices()
})
</script>

<template>
  <div class="probe-page">
    <template v-if="!probeStore.connected">
      <header class="probe-header">
        <span class="spacer" />
        <h1>連接 Probe</h1>
        <button class="icon-button" aria-label="Help" @click="showHelp = !showHelp">
          <HelpCircle :size="20" />
        </button>
      </header>

      <div class="connect-content">
        <p v-if="showHelp" class="help-tip">
          MotoProbe 是一個透過藍牙傳送電瓶電壓的檢測儀。找不到裝置時，請確認 Probe
          電源已開啟，且手機藍牙與定位權限已允許。
        </p>
        <div class="device-illustration">
          <Bluetooth :size="40" color="var(--color-probe-voltage)" />
        </div>
        <p class="device-name">MotoProbe</p>
        <p class="device-subtitle">電壓檢測儀</p>

        <p class="connection-state">未連接</p>

        <PrimaryButton block :disabled="connecting" @click="handleSearch">
          {{ connecting ? '搜尋中...' : '搜尋裝置' }}
        </PrimaryButton>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <button class="mode-toggle" @click="toggleMode">
          <span>{{ isMockMode() ? 'Developer Mode / Mock Probe' : '真實 BLE 模式' }}</span>
          <span class="mode-switch" :class="{ on: isMockMode() }" />
        </button>

        <div class="instructions">
          <h2>使用說明</h2>
          <ol>
            <li>紅色夾接電瓶正極 (+)</li>
            <li>黑色夾接電瓶負極 (-)</li>
            <li>開啟 Probe 電源</li>
            <li>點選「搜尋裝置」</li>
          </ol>
        </div>
      </div>
    </template>

    <template v-else>
      <header class="probe-header">
        <button class="icon-button" aria-label="Back" @click="handleStopMonitoring">
          <ChevronLeft :size="22" />
        </button>
        <h1>Probe 監測中</h1>
        <span class="spacer" />
      </header>

      <div class="monitor-content">
        <ProbeStatusCard :connected="true" device-name="MotoProbe-3846" />

        <div class="voltage-hero">
          <p class="voltage-label">目前電壓</p>
          <p class="voltage-value">
            {{ probeStore.currentVoltage !== null ? probeStore.currentVoltage.toFixed(2) : '--' }}
            <span class="voltage-unit">V</span>
          </p>
        </div>

        <VoltageChart :samples="probeStore.samples" />

        <div class="metric-row">
          <VoltageMetric label="最低電壓" :value="`${probeStore.analysis.minVoltage} V`" />
          <VoltageMetric label="最高電壓" :value="`${probeStore.analysis.maxVoltage} V`" />
          <VoltageMetric label="平均電壓" :value="`${probeStore.analysis.averageVoltage} V`" />
        </div>

        <PrimaryButton variant="danger" block @click="handleStopMonitoring">停止監測</PrimaryButton>
        <PrimaryButton
          v-if="isMockMode()"
          variant="secondary"
          block
          @click="probeStore.simulateEngineStart"
        >
          模擬啟動測試
        </PrimaryButton>
      </div>
    </template>

    <div class="devices-section">
      <button class="devices-toggle" @click="showDevices = !showDevices">
        {{ showDevices ? '隱藏' : '顯示' }}藍牙裝置列表（進階）
      </button>

      <div v-if="showDevices" class="devices-panel">
        <p class="devices-hint">
          一般 BLE 掃描，與上方的 Probe 連線功能各自獨立，用來確認手機藍牙硬體與權限是否正常。
        </p>
        <p class="devices-status">
          藍牙狀態：{{ bluetoothStore.enabled ? '已啟用' : '未知 / 未啟用' }}
        </p>

        <div class="devices-controls">
          <button class="ghost-button" @click="toggleScan">
            {{ bluetoothStore.scanning ? '停止掃描' : '掃描附近裝置' }}
          </button>
          <button class="ghost-button" @click="bluetoothStore.refreshBondedDevices">
            重新整理配對裝置
          </button>
        </div>

        <p v-if="bluetoothStore.errorMessage" class="error">{{ bluetoothStore.errorMessage }}</p>

        <h3>附近裝置</h3>
        <ul class="device-list">
          <li v-for="result in bluetoothStore.scannedDevices" :key="result.device.deviceId">
            <span>{{ result.localName || result.device.name || result.device.deviceId }}</span>
            <span class="device-meta">rssi: {{ result.rssi ?? 'n/a' }}</span>
            <button
              v-if="!bluetoothStore.connectedDeviceIds.includes(result.device.deviceId)"
              class="ghost-button small"
              @click="bluetoothStore.connectTo(result.device.deviceId)"
            >
              連接
            </button>
            <button
              v-else
              class="ghost-button small"
              @click="bluetoothStore.disconnectFrom(result.device.deviceId)"
            >
              斷開
            </button>
          </li>
          <li v-if="bluetoothStore.scannedDevices.length === 0">尚未找到裝置。</li>
        </ul>

        <h3>已配對裝置（僅 Android）</h3>
        <ul class="device-list">
          <li v-for="device in bluetoothStore.bondedDevices" :key="device.deviceId">
            {{ device.name || device.deviceId }}
          </li>
          <li v-if="bluetoothStore.bondedDevices.length === 0">無資料，或此平台不支援。</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.probe-page {
  min-height: 100%;
  background: var(--color-primary-dark);
  color: #fff;
  padding-bottom: var(--space-xl);
}

.probe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 var(--space-md);
  padding-top: env(safe-area-inset-top);
}

.probe-header h1 {
  font-size: 17px;
  font-weight: 700;
}

.spacer {
  width: 36px;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #fff;
  border-radius: var(--radius-sm);
}

.connect-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xl) var(--space-md);
  gap: var(--space-sm);
}

.help-tip {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: var(--space-sm);
}

.device-illustration {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  background: rgba(53, 208, 111, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-sm);
}

.device-name {
  font-size: 18px;
  font-weight: 700;
}

.device-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: var(--space-lg);
}

.connection-state {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: var(--space-md);
}

.error {
  color: #ff8a80;
  font-size: 13px;
}

.mode-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-top: var(--space-md);
}

.mode-switch {
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  position: relative;
}

.mode-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #fff;
  transition: transform 0.15s ease;
}

.mode-switch.on::after {
  transform: translateX(14px);
  background: var(--color-probe-voltage);
}

.instructions {
  width: 100%;
  margin-top: var(--space-xl);
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-lg);
}

.instructions h2 {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.instructions ol {
  margin: 0;
  padding-left: 1.2em;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

.monitor-content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.voltage-hero {
  text-align: center;
  padding: var(--space-lg) 0;
}

.voltage-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: var(--space-xs);
}

.voltage-value {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-probe-voltage);
}

.voltage-unit {
  font-size: 20px;
  font-weight: 600;
}

.metric-row {
  display: flex;
  padding: var(--space-md) 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.devices-section {
  padding: var(--space-md);
}

.devices-toggle {
  width: 100%;
  text-align: center;
  padding: var(--space-sm);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-md);
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.devices-panel {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.devices-hint,
.devices-status {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.devices-controls {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.ghost-button {
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #fff;
  font-size: 13px;
}

.ghost-button.small {
  padding: 4px 10px;
  font-size: 12px;
}

.devices-panel h3 {
  font-size: 13px;
  font-weight: 700;
  margin-top: var(--space-sm);
  color: rgba(255, 255, 255, 0.7);
}

.device-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.device-list li {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
}

.device-meta {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}
</style>
