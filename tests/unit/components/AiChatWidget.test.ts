import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/media/image-compression.service', () => ({
  imageCompressionService: {
    compressImage: vi.fn(async (b: Blob) => ({
      blob: new Blob([b], { type: 'image/jpeg' }),
      width: 1,
      height: 1,
    })),
  },
}))

import AiChatWidget from '@/components/verification/ai-chat/AiChatWidget.vue'
import { useAiChatStore } from '@/stores/ai-chat.store'
import * as fn from '../fakes/functions'

const body = () => document.body
const q = (sel: string) => body().querySelector(sel) as HTMLElement | null

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:preview' }))
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('ai-chat store', () => {
  it('sends the whole conversation (text + photo) and appends the reply', async () => {
    const seen: unknown[] = []
    fn.__setCallable('askAiAssistant', (data) => {
      seen.push(data)
      return { text: `回覆${seen.length}` }
    })
    const chat = useAiChatStore()
    await chat.attachImage(new Blob(['img'], { type: 'image/png' }))
    await chat.send('  這是刮傷嗎？  ')
    await chat.send('那要多少錢修？')
    expect(chat.messages.map((m) => [m.role, m.text])).toEqual([
      ['user', '這是刮傷嗎？'],
      ['model', '回覆1'],
      ['user', '那要多少錢修？'],
      ['model', '回覆2'],
    ])
    const second = seen[1] as { turns: { role: string; text: string; image?: unknown }[] }
    expect(second.turns).toHaveLength(3)
    expect(second.turns[0].image).toEqual({ base64: expect.any(String), mimeType: 'image/jpeg' })
    expect(second.turns[2].image).toBeUndefined()
    expect(chat.pendingImage).toBeNull()
  })

  it('photo-only sends are allowed; empty sends are ignored', async () => {
    fn.__setCallable('askAiAssistant', () => ({ text: 'ok' }))
    const chat = useAiChatStore()
    await chat.send('   ')
    expect(fn.calls).toHaveLength(0)
    chat.askAboutEvidencePhoto('verifications/v1/evidence/a.jpg', 'https://preview')
    expect(chat.open).toBe(true)
    await chat.send('')
    expect(fn.calls[0].data).toEqual({
      turns: [
        { role: 'user', text: '', image: { storagePath: 'verifications/v1/evidence/a.jpg' } },
      ],
    })
  })

  it('a failed call shows an error bubble that is not resent later', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const chat = useAiChatStore()
    await chat.send('hi') // no handler registered → callable fails
    expect(chat.messages.at(-1)).toMatchObject({ role: 'model', error: true })
    expect(chat.messages.at(-1)!.text).toContain('AI 暫時無法回覆')
    fn.__setCallable('askAiAssistant', () => ({ text: 'back' }))
    await chat.send('again')
    const turns = (fn.calls.at(-1)!.data as { turns: { role: string }[] }).turns
    expect(turns.map((t) => t.role)).toEqual(['user', 'user'])
  })

  it('reset clears everything', async () => {
    const chat = useAiChatStore()
    chat.askAboutEvidencePhoto('verifications/v1/evidence/a.jpg', 'x')
    chat.reset()
    expect(chat.open).toBe(false)
    expect(chat.pendingImage).toBeNull()
    expect(chat.messages).toEqual([])
  })
})

describe('AiChatWidget', () => {
  function pointer(el: Element, type: string, x: number, y: number) {
    el.dispatchEvent(
      new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true }),
    )
  }

  it('floating button opens the panel; typing + Enter sends; reply is shown', async () => {
    fn.__setCallable('askAiAssistant', () => ({ text: '看起來是輕微刮痕。' }))
    const wrapper = mount(AiChatWidget, { attachTo: document.body, props: { showFab: true } })
    const fab = q('.ai-fab')!
    pointer(fab, 'pointerdown', 100, 100)
    pointer(fab, 'pointerup', 100, 100) // a tap, not a drag
    await flushPromises()
    expect(q('.ai-panel')).not.toBeNull()
    expect(q('.ai-intro')!.textContent).toContain('拍照或輸入文字問 AI')
    const textarea = q('.ai-input textarea') as HTMLTextAreaElement
    textarea.value = '這樣正常嗎？'
    textarea.dispatchEvent(new Event('input'))
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await flushPromises()
    const bubbles = [...body().querySelectorAll('.ai-msg')].map((el) => el.textContent?.trim())
    expect(bubbles).toEqual(['這樣正常嗎？', '看起來是輕微刮痕。'])
    expect(textarea.value).toBe('')
    wrapper.unmount()
  })

  it('attaching a photo shows the preview; send is enabled with just the photo', async () => {
    const wrapper = mount(AiChatWidget, { attachTo: document.body })
    useAiChatStore().open = true
    await flushPromises()
    const send = q('.send-btn') as HTMLButtonElement
    expect(send.disabled).toBe(true)
    const input = q('.ai-input .file-input') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'p.jpg', { type: 'image/jpeg' })],
    })
    input.dispatchEvent(new Event('change'))
    await vi.waitFor(() => expect(q('.ai-pending img')).not.toBeNull())
    expect(send.disabled).toBe(false)
    ;(q('.ai-pending .icon-btn') as HTMLButtonElement).click()
    await flushPromises()
    expect(q('.ai-pending')).toBeNull()
    wrapper.unmount()
  })

  it('hidden while a recording session needs the screen; closing keeps the chat', async () => {
    const wrapper = mount(AiChatWidget, { attachTo: document.body, props: { hidden: true } })
    await flushPromises()
    expect((q('.ai-chat-root') as HTMLElement).style.display).toBe('none')
    await wrapper.setProps({ hidden: false })
    expect((q('.ai-chat-root') as HTMLElement).style.display).toBe('')
    wrapper.unmount()
  })

  it('the button only appears where the parent asks for it (the 12-point check)', async () => {
    const wrapper = mount(AiChatWidget, { attachTo: document.body, props: { showFab: false } })
    await flushPromises()
    expect(q('.ai-fab')).toBeNull()
    // …but a photo's 「詢問 AI」 can still open the panel there.
    useAiChatStore().askAboutEvidencePhoto('verifications/v1/evidence/a.jpg', 'blob:x')
    await flushPromises()
    expect(q('.ai-panel')).not.toBeNull()
    expect(q('.ai-pending img')).not.toBeNull()
    await wrapper.setProps({ showFab: true })
    expect(q('.ai-fab')).toBeNull() // panel open → no button on top of it
    wrapper.unmount()
  })

  it('dragging moves the button (and remembers it) without opening the chat', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const wrapper = mount(AiChatWidget, { attachTo: document.body, props: { showFab: true } })
    const fab = q('.ai-fab')!
    expect(fab.style.right).toBe('16px')
    pointer(fab, 'pointerdown', 300, 600)
    pointer(fab, 'pointermove', 250, 500) // 50px left, 100px up
    pointer(fab, 'pointerup', 250, 500)
    await flushPromises()
    expect(useAiChatStore().open).toBe(false)
    expect(fab.style.right).toBe('66px')
    expect(fab.style.bottom).toContain('196px')
    expect(JSON.parse(localStorage.getItem('motoverify:aiFabPos')!)).toEqual({
      right: 66,
      bottom: 196,
    })
    wrapper.unmount()

    // a fresh widget starts where it was left
    const again = mount(AiChatWidget, { attachTo: document.body, props: { showFab: true } })
    expect(q('.ai-fab')!.style.right).toBe('66px')
    again.unmount()
  })

  it('cannot be dragged off screen', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const wrapper = mount(AiChatWidget, { attachTo: document.body, props: { showFab: true } })
    const fab = q('.ai-fab')!
    pointer(fab, 'pointerdown', 300, 600)
    pointer(fab, 'pointermove', 5000, 5000)
    pointer(fab, 'pointerup', 5000, 5000)
    await flushPromises()
    expect(fab.style.right).toBe('8px')
    expect(fab.style.bottom).toContain('8px')
    wrapper.unmount()
  })

  it('fades to half-transparent when idle, back to full on touch', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const wrapper = mount(AiChatWidget, { attachTo: document.body, props: { showFab: true } })
    const fab = q('.ai-fab')!
    expect(fab.classList.contains('idle')).toBe(false)
    await vi.advanceTimersByTimeAsync(3000)
    expect(fab.classList.contains('idle')).toBe(true)
    pointer(fab, 'pointerdown', 10, 10)
    await flushPromises()
    expect(fab.classList.contains('idle')).toBe(false)
    vi.useRealTimers()
    wrapper.unmount()
  })
})
