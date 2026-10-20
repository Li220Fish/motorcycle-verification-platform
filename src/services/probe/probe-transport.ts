import type { ProbeCommand } from './probe-protocol'

export interface ProbeConnection {
  deviceId: string
  name: string
}

/** Byte pipe between the app and one probe. ProbeClient (probe.service.ts)
 *  owns the protocol on top of it — framing, matching responses to commands,
 *  timeouts — so the BLE and mock implementations stay dumb. */
export interface ProbeTransport {
  readonly kind: 'ble' | 'mock'
  connect(): Promise<ProbeConnection>
  disconnect(): Promise<void>
  write(command: ProbeCommand): Promise<void>
  /** Raw notification text, possibly a fragment of a JSON object. */
  onText(callback: (text: string) => void): void
  /** Link dropped without disconnect() being called (out of range, power off). */
  onDisconnected(callback: () => void): void
}
