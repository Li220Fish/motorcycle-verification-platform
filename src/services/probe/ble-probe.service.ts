import { BleClient, textToDataView } from '@capacitor-community/bluetooth-le'

import { platformService } from '@/services/platform/platform.service'

import {
  PROBE_DEVICE_NAME_PREFIX,
  PROBE_RX_CHARACTERISTIC_UUID,
  PROBE_SERVICE_UUID,
  PROBE_TX_CHARACTERISTIC_UUID,
  type ProbeCommand,
} from './probe-protocol'
import type { ProbeConnection, ProbeTransport } from './probe-transport'

/**
 * Real MotoBattery_Probe over BLE. @capacitor-community/bluetooth-le is the
 * one API for both builds: Android's native GATT stack in the APK (requests a
 * 512-byte MTU on connect by itself — the firmware's JSON never splits), and
 * Web Bluetooth in the browser (Chrome/Edge; not Safari/iOS).
 */
export class BleProbeTransport implements ProbeTransport {
  readonly kind = 'ble' as const
  private deviceId: string | null = null
  private textCallbacks: Array<(text: string) => void> = []
  private disconnectCallbacks: Array<() => void> = []
  private initialized = false

  static isSupported(): boolean {
    if (platformService.isNative()) return true
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return
    await BleClient.initialize()
    this.initialized = true
    if (platformService.isNative()) {
      try {
        await BleClient.setDisplayStrings({
          scanning: `搜尋 ${PROBE_DEVICE_NAME_PREFIX} 中…`,
          cancel: '取消',
          availableDevices: '找到的 Probe',
          noDeviceFound: `找不到 ${PROBE_DEVICE_NAME_PREFIX}，請確認電源已開啟`,
        })
      } catch {
        // Cosmetic only — the picker still works with the plugin's defaults.
      }
    }
  }

  async connect(): Promise<ProbeConnection> {
    if (!BleProbeTransport.isSupported()) {
      throw new Error('此瀏覽器不支援藍牙連線，請改用 Chrome／Edge 或 RiDE App。')
    }
    await this.ensureInitialized()
    // namePrefix makes both the Android picker and the browser chooser list
    // only MotoBattery_Probe* devices. optionalServices is required on web —
    // Web Bluetooth refuses access to any service not declared here.
    const device = await BleClient.requestDevice({
      namePrefix: PROBE_DEVICE_NAME_PREFIX,
      optionalServices: [PROBE_SERVICE_UUID],
    })
    await BleClient.connect(device.deviceId, () => {
      if (this.deviceId !== device.deviceId) return
      this.deviceId = null
      this.disconnectCallbacks.forEach((callback) => callback())
    })
    this.deviceId = device.deviceId
    // UTF-8, streaming: the firmware's judgment/message text is Chinese, and
    // the plugin's own dataViewToText() decodes byte-by-byte as Latin-1
    // (garbled 「探針未夾緊」 into "æ¢éæª…" — found on the real probe). The
    // `stream` flag also keeps a multi-byte character intact if a long JSON
    // ever arrives split across two notifications.
    const decoder = new TextDecoder('utf-8')
    try {
      await BleClient.startNotifications(
        device.deviceId,
        PROBE_SERVICE_UUID,
        PROBE_TX_CHARACTERISTIC_UUID,
        (value) => {
          const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
          const text = decoder.decode(bytes, { stream: true })
          this.textCallbacks.forEach((callback) => callback(text))
        },
      )
    } catch (error) {
      this.deviceId = null
      await BleClient.disconnect(device.deviceId).catch(() => {})
      throw error
    }
    return { deviceId: device.deviceId, name: device.name ?? PROBE_DEVICE_NAME_PREFIX }
  }

  async disconnect(): Promise<void> {
    const deviceId = this.deviceId
    this.deviceId = null
    if (!deviceId) return
    await BleClient.stopNotifications(
      deviceId,
      PROBE_SERVICE_UUID,
      PROBE_TX_CHARACTERISTIC_UUID,
    ).catch(() => {})
    await BleClient.disconnect(deviceId).catch(() => {})
  }

  async write(command: ProbeCommand): Promise<void> {
    if (!this.deviceId) throw new Error('PROBE_DISCONNECTED')
    await BleClient.write(
      this.deviceId,
      PROBE_SERVICE_UUID,
      PROBE_RX_CHARACTERISTIC_UUID,
      textToDataView(command),
    )
  }

  onText(callback: (text: string) => void): void {
    this.textCallbacks.push(callback)
  }

  onDisconnected(callback: () => void): void {
    this.disconnectCallbacks.push(callback)
  }
}
