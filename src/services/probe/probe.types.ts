export interface VoltageSample {
  timestamp: number
  voltage: number
}

export type ProbeMode = 'mock' | 'ble'

export type ProbeConnectionState = 'disconnected' | 'connecting' | 'connected'
