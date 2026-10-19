import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hw = vi.hoisted(() => ({
  native: { value: false },
  voice: {
    hasAudioRecordingPermission: vi.fn(),
    requestAudioRecordingPermission: vi.fn(),
    canDeviceVoiceRecord: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  },
  camera: { takePhoto: vi.fn(), recordVideo: vi.fn() },
  torch: { isAvailable: vi.fn(), enable: vi.fn(), disable: vi.fn() },
  ble: {
    initialize: vi.fn(),
    isEnabled: vi.fn(),
    requestLEScan: vi.fn(),
    stopLEScan: vi.fn(),
    getBondedDevices: vi.fn(),
    getConnectedDevices: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => hw.native.value,
    getPlatform: () => (hw.native.value ? 'android' : 'web'),
    convertFileSrc: (u: string) => u,
  },
}))
vi.mock('capacitor-voice-recorder', () => ({ VoiceRecorder: hw.voice }))
vi.mock('@capacitor/camera', () => ({ Camera: hw.camera }))
vi.mock('@capawesome/capacitor-torch', () => ({ Torch: hw.torch }))
vi.mock('@capacitor-community/bluetooth-le', () => ({ BleClient: hw.ble }))

import { MAX_LONG_EDGE } from '@/config/imageUpload.config'
import { audioRecorderService } from '@/services/media/audio-recorder.service'
import { cameraService } from '@/services/media/camera.service'
import { liveCameraService } from '@/services/media/live-camera.service'
import { videoRecorderService } from '@/services/media/video-recorder.service'
import {
  computeMotionSummary,
  motionCaptureService,
} from '@/services/motion/motion-capture.service'
import { devlogService } from '@/services/firebase/devlog.service'
import { useBluetoothStore } from '@/stores/bluetooth.store'
import * as fs from '../fakes/firestore'

function fakeTrack(
  settings: Record<string, unknown> = {},
  capabilities: Record<string, unknown> = {},
) {
  return {
    stop: vi.fn(),
    getSettings: () => settings,
    getCapabilities: () => capabilities,
    applyConstraints: vi.fn(async () => {}),
  }
}
function fakeStream(track = fakeTrack()) {
  return { getTracks: () => [track], getVideoTracks: () => [track], track }
}

beforeEach(() => {
  hw.native.value = false
  for (const group of [hw.voice, hw.camera, hw.torch, hw.ble])
    for (const f of Object.values(group)) f.mockReset()
})
afterEach(() => vi.unstubAllGlobals())

describe('audioRecorderService', () => {
  it('requests permission when missing and decodes the base64 result', async () => {
    hw.voice.hasAudioRecordingPermission.mockResolvedValue({ value: false })
    hw.voice.requestAudioRecordingPermission.mockResolvedValue({ value: true })
    hw.voice.canDeviceVoiceRecord.mockResolvedValue({ value: true })
    hw.voice.startRecording.mockResolvedValue({ value: true })
    hw.voice.stopRecording.mockResolvedValue({
      value: { recordDataBase64: btoa('abc'), mimeType: 'audio/aac', msDuration: 1234 },
    })
    await audioRecorderService.start()
    const { blob, durationMs } = await audioRecorderService.stop()
    expect(durationMs).toBe(1234)
    expect(blob.type).toBe('audio/aac')
    expect(await blob.text()).toBe('abc')
  })

  it('denied permission / unsupported device / failed start / empty data all throw', async () => {
    hw.voice.hasAudioRecordingPermission.mockResolvedValue({ value: false })
    hw.voice.requestAudioRecordingPermission.mockResolvedValue({ value: false })
    await expect(audioRecorderService.checkPermission()).rejects.toThrow('denied')
    hw.voice.hasAudioRecordingPermission.mockResolvedValue({ value: true })
    hw.voice.canDeviceVoiceRecord.mockResolvedValue({ value: false })
    await expect(audioRecorderService.checkPermission()).rejects.toThrow('cannot record')
    hw.voice.canDeviceVoiceRecord.mockResolvedValue({ value: true })
    hw.voice.startRecording.mockResolvedValue({ value: false })
    await expect(audioRecorderService.start()).rejects.toThrow('Failed to start')
    hw.voice.stopRecording.mockResolvedValue({
      value: { recordDataBase64: '', mimeType: 'x', msDuration: 0 },
    })
    await expect(audioRecorderService.stop()).rejects.toThrow('No audio data')
  })
})

describe('cameraService', () => {
  it('takePhoto caps the native result to MAX_LONG_EDGE', async () => {
    hw.camera.takePhoto.mockResolvedValue({ path: 'p' })
    await cameraService.takePhoto()
    expect(hw.camera.takePhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        targetWidth: MAX_LONG_EDGE,
        targetHeight: MAX_LONG_EDGE,
        saveToGallery: false,
      }),
    )
  })
  it('recordVideo is native-only', async () => {
    await expect(cameraService.recordVideo()).rejects.toThrow(
      'only available in the Android/iOS app',
    )
    hw.native.value = true
    hw.camera.recordVideo.mockResolvedValue({ path: 'v' })
    expect(await cameraService.recordVideo()).toEqual({ path: 'v' })
  })
})

describe('liveCameraService', () => {
  it('throws without getUserMedia', async () => {
    vi.stubGlobal('navigator', {})
    await expect(liveCameraService.start()).rejects.toThrow('不支援相機預覽')
  })

  it('asks for a usable resolution and reports what arrived', async () => {
    const stream = fakeStream(fakeTrack({ width: 1920, height: 1080 }))
    const getUserMedia = vi.fn(async () => stream)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
    await liveCameraService.start()
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1440 } },
      audio: false,
    })
    expect(liveCameraService.getAchievedResolution()).toEqual({ width: 1920, height: 1080 })
    liveCameraService.stop()
    expect(stream.track.stop).toHaveBeenCalled()
    expect(liveCameraService.getAchievedResolution()).toBeNull()
  })

  it('web torch: capability check + applyConstraints', async () => {
    const stream = fakeStream(fakeTrack({}, { torch: true }))
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => stream } })
    await liveCameraService.start()
    expect(await liveCameraService.isTorchSupported()).toBe(true)
    await liveCameraService.setTorch(true)
    expect(stream.track.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] })
    liveCameraService.stop()
    await expect(liveCameraService.setTorch(true)).rejects.toThrow('沒有可用的相機串流')
  })

  it('native torch first; falls back to web when native fails (CAMERA_IN_USE)', async () => {
    hw.native.value = true
    const stream = fakeStream(fakeTrack({}, { torch: false }))
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => stream } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    hw.torch.isAvailable.mockResolvedValue({ available: true })
    hw.torch.disable.mockResolvedValue(undefined)
    await liveCameraService.start('environment')
    expect(await liveCameraService.isTorchSupported()).toBe(true)
    hw.torch.enable.mockRejectedValue(new Error('CAMERA_IN_USE'))
    await liveCameraService.setTorch(true)
    expect(stream.track.applyConstraints).toHaveBeenCalled()
    // Front camera never uses the native torch.
    await liveCameraService.start('user')
    hw.torch.isAvailable.mockClear()
    expect(await liveCameraService.isTorchSupported()).toBe(false)
    expect(hw.torch.isAvailable).not.toHaveBeenCalled()
    liveCameraService.stop()
  })
})

describe('videoRecorderService', () => {
  class FakeRecorder {
    static isTypeSupported = (t: string) => t === 'video/webm'
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    start = vi.fn()
    stop = vi.fn(() => {
      this.ondataavailable?.({ data: new Blob(['frame']) })
      this.onstop?.()
    })
    constructor(
      public stream: unknown,
      public options?: unknown,
    ) {}
  }

  it('records with the first supported mime type and releases the camera on stop', async () => {
    const stream = fakeStream()
    vi.stubGlobal('MediaRecorder', FakeRecorder)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => stream } })
    await videoRecorderService.start()
    const result = await videoRecorderService.stop()
    expect(result.mimeType).toBe('video/webm')
    expect(await result.blob.text()).toBe('frame')
    expect(stream.track.stop).toHaveBeenCalled()
    await expect(videoRecorderService.stop()).rejects.toThrow('尚未開始錄影')
  })

  it('releases the stream when MediaRecorder construction fails', async () => {
    const stream = fakeStream()
    vi.stubGlobal(
      'MediaRecorder',
      Object.assign(
        function () {
          throw new Error('unsupported')
        },
        { isTypeSupported: () => false },
      ),
    )
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => stream } })
    await expect(videoRecorderService.start()).rejects.toThrow('unsupported')
    expect(stream.track.stop).toHaveBeenCalled()
  })

  it('cancel stops everything without a result', async () => {
    const stream = fakeStream()
    vi.stubGlobal('MediaRecorder', FakeRecorder)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => stream } })
    await videoRecorderService.start()
    videoRecorderService.cancel()
    expect(stream.track.stop).toHaveBeenCalled()
    await expect(videoRecorderService.stop()).rejects.toThrow()
  })

  it('unsupported browser', async () => {
    vi.stubGlobal('navigator', {})
    await expect(videoRecorderService.start()).rejects.toThrow('不支援錄影')
  })
})

describe('motion capture', () => {
  it('records accelerometer + rotation samples until stopped', async () => {
    vi.stubGlobal('DeviceMotionEvent', class {})
    const samples: unknown[] = []
    await motionCaptureService.start((s) => samples.push(s))
    const event = new Event('devicemotion')
    Object.defineProperty(event, 'accelerationIncludingGravity', { value: { x: 1, y: 2, z: null } })
    Object.defineProperty(event, 'rotationRate', { value: { alpha: 5, beta: null, gamma: 7 } })
    window.dispatchEvent(event)
    motionCaptureService.stop()
    window.dispatchEvent(event)
    expect(samples).toEqual([expect.objectContaining({ x: 1, y: 2, z: 0, gx: 5, gy: 0, gz: 7 })])
  })

  it('unsupported or denied → localized error', async () => {
    vi.stubGlobal('DeviceMotionEvent', undefined)
    expect(motionCaptureService.isSupported()).toBe(false)
    await expect(motionCaptureService.start(() => {})).rejects.toThrow('此裝置暫不支援動態感測')
    vi.stubGlobal('DeviceMotionEvent', { requestPermission: async () => 'denied' })
    await expect(motionCaptureService.start(() => {})).rejects.toThrow()
  })

  it('computeMotionSummary', () => {
    const s = (x: number, y: number, z: number) => ({ timestamp: 0, x, y, z, gx: 0, gy: 0, gz: 0 })
    expect(computeMotionSummary([])).toEqual({
      sampleCount: 0,
      avgMagnitude: 0,
      stddevMagnitude: 0,
    })
    expect(computeMotionSummary([s(3, 4, 0), s(0, 0, 10)])).toEqual({
      sampleCount: 2,
      avgMagnitude: 7.5,
      stddevMagnitude: 2.5,
    })
  })
})

describe('bluetooth store', () => {
  it('initializes once, de-duplicates scan results, tracks connections', async () => {
    hw.ble.isEnabled.mockResolvedValue(true)
    hw.ble.requestLEScan.mockImplementation(async (_opts: unknown, cb: (r: unknown) => void) => {
      cb({ device: { deviceId: 'a' } })
      cb({ device: { deviceId: 'a' } })
      cb({ device: { deviceId: 'b' } })
    })
    let onDisconnect: () => void = () => {}
    hw.ble.connect.mockImplementation(async (_id: string, cb: () => void) => (onDisconnect = cb))
    hw.ble.getBondedDevices.mockResolvedValue([{ deviceId: 'x' }])
    const store = useBluetoothStore()
    await store.checkEnabled()
    await store.startScan()
    await store.stopScan()
    await store.refreshBondedDevices()
    await store.connectTo('a')
    expect(store.enabled).toBe(true)
    expect(store.scannedDevices.map((d) => d.device.deviceId)).toEqual(['a', 'b'])
    expect(store.scanning).toBe(false)
    expect(store.bondedDevices).toEqual([{ deviceId: 'x' }])
    expect(store.connectedDeviceIds).toEqual(['a'])
    expect(hw.ble.initialize).toHaveBeenCalledTimes(1)
    onDisconnect()
    expect(store.connectedDeviceIds).toEqual([])
    await store.connectTo('b')
    await store.disconnectFrom('b')
    expect(store.connectedDeviceIds).toEqual([])
  })

  it('errors land in errorMessage', async () => {
    const store = useBluetoothStore()
    hw.ble.isEnabled.mockRejectedValue(new Error('no adapter'))
    await store.checkEnabled()
    expect(store.errorMessage).toBe('no adapter')
    hw.ble.requestLEScan.mockRejectedValue(new Error('scan denied'))
    await store.startScan()
    expect(store.errorMessage).toBe('scan denied')
    expect(store.scanning).toBe(false)
    hw.ble.connect.mockRejectedValue('weird')
    await store.connectTo('z')
    expect(store.errorMessage).toBe('Connect failed')
    hw.ble.getBondedDevices.mockRejectedValue(new Error('android only'))
    await store.refreshBondedDevices()
    expect(store.errorMessage).toBe('android only')
  })
})

describe('devlogService', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0))

  it('submissions (newest first), countdowns (create/edit/delete), overrides, tombstones', async () => {
    await devlogService.addSubmission({ author: 'a', text: '1' } as never)
    await new Promise((r) => setTimeout(r, 5))
    await devlogService.addSubmission({ author: 'b', text: '2' } as never)
    let subs: { data: { text: string } }[] = []
    devlogService.subscribeSubmissions((d) => (subs = d as never))
    await flush()
    expect(subs.map((s) => s.data.text)).toEqual(['2', '1'])

    const id = await devlogService.saveCountdown({ label: 'demo', createdAt: 1 } as never)
    await devlogService.saveCountdown({ label: 'demo2', createdAt: 1 } as never, id)
    let countdowns: { id: string; data: { label: string } }[] = []
    devlogService.subscribeCountdowns((l) => (countdowns = l as never))
    await flush()
    expect(countdowns).toEqual([{ id, data: { label: 'demo2', createdAt: 1 } }])
    await devlogService.deleteCountdown(id)
    await flush()
    expect(countdowns).toEqual([])

    let overrides = {}
    let deletions = {}
    devlogService.subscribeOverrides((m) => (overrides = m))
    devlogService.subscribeDeletions((m) => (deletions = m))
    await devlogService.saveOverride('e1', { title: 'fixed' } as never)
    await devlogService.deleteEntry('e2', { by: 'x' } as never)
    await flush()
    expect(overrides).toEqual({ e1: { title: 'fixed' } })
    expect(deletions).toEqual({ e2: { by: 'x' } })
    await devlogService.restoreEntry('e2')
    await flush()
    expect(deletions).toEqual({})
    expect(fs.__paths('devlog_deletions/')).toEqual([])
  })
})
