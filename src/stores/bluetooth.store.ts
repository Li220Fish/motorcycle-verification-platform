import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BleDevice, ScanResult } from '@capacitor-community/bluetooth-le'

import { bleService } from '@/services/bluetooth/ble.service'

export const useBluetoothStore = defineStore('bluetooth', () => {
  const enabled = ref(false)
  const scanning = ref(false)
  const scannedDevices = ref<ScanResult[]>([])
  const bondedDevices = ref<BleDevice[]>([])
  const connectedDeviceIds = ref<string[]>([])
  const errorMessage = ref('')

  async function checkEnabled(): Promise<void> {
    try {
      enabled.value = await bleService.isEnabled()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Bluetooth unavailable'
    }
  }

  async function startScan(): Promise<void> {
    errorMessage.value = ''
    scannedDevices.value = []
    try {
      scanning.value = true
      await bleService.startScan((result) => {
        const exists = scannedDevices.value.some(
          (d) => d.device.deviceId === result.device.deviceId,
        )
        if (!exists) scannedDevices.value.push(result)
      })
    } catch (error) {
      scanning.value = false
      errorMessage.value = error instanceof Error ? error.message : 'Scan failed'
    }
  }

  async function stopScan(): Promise<void> {
    try {
      await bleService.stopScan()
    } finally {
      scanning.value = false
    }
  }

  async function refreshBondedDevices(): Promise<void> {
    try {
      bondedDevices.value = await bleService.getBondedDevices()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to read bonded devices'
    }
  }

  async function connectTo(deviceId: string): Promise<void> {
    errorMessage.value = ''
    try {
      await bleService.connect(deviceId, () => {
        connectedDeviceIds.value = connectedDeviceIds.value.filter((id) => id !== deviceId)
      })
      connectedDeviceIds.value = [...connectedDeviceIds.value, deviceId]
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Connect failed'
    }
  }

  async function disconnectFrom(deviceId: string): Promise<void> {
    await bleService.disconnect(deviceId)
    connectedDeviceIds.value = connectedDeviceIds.value.filter((id) => id !== deviceId)
  }

  return {
    enabled,
    scanning,
    scannedDevices,
    bondedDevices,
    connectedDeviceIds,
    errorMessage,
    checkEnabled,
    startScan,
    stopScan,
    refreshBondedDevices,
    connectTo,
    disconnectFrom,
  }
})
