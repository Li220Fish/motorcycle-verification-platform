<script setup lang="ts">
import { onMounted } from 'vue'

import { platformService } from '@/services/platform/platform.service'
import { useProbeStore } from '@/stores/probe.store'
import { useBluetoothStore } from '@/stores/bluetooth.store'
import PageHeader from '@/components/common/PageHeader.vue'

const probeStore = useProbeStore()
const bluetoothStore = useBluetoothStore()

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
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
  <section>
    <PageHeader
      title="Voltage Probe Test"
      description="Developer test page for the Mock/BLE voltage probe abstraction."
    />

    <table class="info-table">
      <tbody>
        <tr>
          <td>Environment</td>
          <td>{{ platformService.getPlatform() }}</td>
        </tr>
        <tr>
          <td>Probe Mode</td>
          <td>{{ probeStore.mode }}</td>
        </tr>
        <tr>
          <td>Connection</td>
          <td>{{ probeStore.connected ? 'Connected' : 'Disconnected' }}</td>
        </tr>
        <tr>
          <td>Current Voltage</td>
          <td>
            {{ probeStore.currentVoltage !== null ? `${probeStore.currentVoltage} V` : 'n/a' }}
          </td>
        </tr>
        <tr>
          <td>Samples</td>
          <td>{{ probeStore.sampleCount }}</td>
        </tr>
      </tbody>
    </table>

    <div class="controls">
      <button :disabled="probeStore.connected" @click="probeStore.connect">Connect</button>
      <button :disabled="!probeStore.connected || probeStore.measuring" @click="probeStore.start">
        Start
      </button>
      <button :disabled="!probeStore.measuring" @click="probeStore.simulateEngineStart">
        Simulate Engine Start
      </button>
      <button :disabled="!probeStore.measuring" @click="probeStore.stop">Stop</button>
      <button :disabled="!probeStore.connected" @click="probeStore.disconnect">Disconnect</button>
    </div>

    <h2>Analysis</h2>
    <table class="info-table">
      <tbody>
        <tr>
          <td>Min</td>
          <td>{{ probeStore.analysis.minVoltage }} V</td>
        </tr>
        <tr>
          <td>Max</td>
          <td>{{ probeStore.analysis.maxVoltage }} V</td>
        </tr>
        <tr>
          <td>Average</td>
          <td>{{ probeStore.analysis.averageVoltage }} V</td>
        </tr>
        <tr>
          <td>Sample Count</td>
          <td>{{ probeStore.analysis.sampleCount }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Recent Samples (latest 20)</h2>
    <table class="sample-table">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Voltage</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="sample in probeStore.recentSamples" :key="sample.timestamp">
          <td>{{ formatTime(sample.timestamp) }}</td>
          <td>{{ sample.voltage }} V</td>
        </tr>
      </tbody>
    </table>

    <h2>Bluetooth Devices</h2>
    <p class="hint">
      General BLE scan — independent from the Mock/BLE Probe above. Useful to confirm this device's
      Bluetooth adapter and permissions actually work.
    </p>
    <table class="info-table">
      <tbody>
        <tr>
          <td>Bluetooth Adapter</td>
          <td>{{ bluetoothStore.enabled ? 'Enabled' : 'Disabled / Unknown' }}</td>
        </tr>
      </tbody>
    </table>

    <div class="controls">
      <button @click="toggleScan">
        {{ bluetoothStore.scanning ? 'Stop Scan' : 'Scan Nearby' }}
      </button>
      <button @click="bluetoothStore.refreshBondedDevices">Refresh Paired Devices</button>
    </div>

    <p v-if="bluetoothStore.errorMessage" class="error">{{ bluetoothStore.errorMessage }}</p>

    <h3>Nearby (scan results)</h3>
    <ul class="device-list">
      <li v-for="result in bluetoothStore.scannedDevices" :key="result.device.deviceId">
        <span>{{ result.localName || result.device.name || result.device.deviceId }}</span>
        <span class="device-meta">rssi: {{ result.rssi ?? 'n/a' }}</span>
        <button
          v-if="!bluetoothStore.connectedDeviceIds.includes(result.device.deviceId)"
          @click="bluetoothStore.connectTo(result.device.deviceId)"
        >
          Connect
        </button>
        <button v-else @click="bluetoothStore.disconnectFrom(result.device.deviceId)">
          Disconnect
        </button>
      </li>
      <li v-if="bluetoothStore.scannedDevices.length === 0">No devices found yet.</li>
    </ul>

    <h3>Paired with this phone (Android only)</h3>
    <ul class="device-list">
      <li v-for="device in bluetoothStore.bondedDevices" :key="device.deviceId">
        {{ device.name || device.deviceId }}
      </li>
      <li v-if="bluetoothStore.bondedDevices.length === 0">
        None found (or not supported on this platform).
      </li>
    </ul>

    <h3>Connected via this app</h3>
    <ul class="device-list">
      <li v-for="deviceId in bluetoothStore.connectedDeviceIds" :key="deviceId">{{ deviceId }}</li>
      <li v-if="bluetoothStore.connectedDeviceIds.length === 0">No active connections.</li>
    </ul>
  </section>
</template>

<style scoped>
.info-table,
.sample-table {
  border-collapse: collapse;
  width: 100%;
  max-width: 480px;
  margin-bottom: 1.5rem;
}

.info-table td,
.sample-table td,
.sample-table th {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #e0e0e0;
  text-align: left;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.hint {
  color: #666;
  margin-top: -0.5rem;
}

.error {
  color: #b00020;
}

.device-list {
  list-style: none;
  padding: 0;
  max-width: 480px;
  margin-bottom: 1.5rem;
}

.device-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.device-meta {
  color: #666;
  font-size: 0.85rem;
}
</style>
