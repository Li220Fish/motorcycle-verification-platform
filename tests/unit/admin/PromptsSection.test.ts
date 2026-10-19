import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import PromptsSection from '@/admin/sections/PromptsSection.vue'
import * as fn from '../fakes/functions'

const prompt = {
  key: 'core-vision-rear-v1',
  label: '核心影像判定（車尾）',
  defaultText: 'default text',
  overrideText: null,
  updatedAt: null,
  updatedBy: null,
}

describe('PromptsSection', () => {
  it('loads the catalog and selects the first prompt', async () => {
    fn.__setCallable('getAiPromptCatalog', () => ({ prompts: [prompt] }))
    const wrapper = mount(PromptsSection)
    await flushPromises()
    expect(wrapper.findAll('.prompt-item')).toHaveLength(1)
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('default text')
    expect(wrapper.find('.prompt-load-error').exists()).toBe(false)
  })

  it('a failed catalog load shows an error with a working retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fn.__setCallable('getAiPromptCatalog', () => {
      throw new Error('permission-denied')
    })
    const wrapper = mount(PromptsSection)
    await flushPromises()
    const error = wrapper.find('.prompt-load-error')
    expect(error.exists()).toBe(true)
    expect(error.text()).toContain('permission-denied')
    expect(wrapper.text()).not.toContain('載入中')

    fn.__setCallable('getAiPromptCatalog', () => ({ prompts: [prompt] }))
    await error.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.prompt-load-error').exists()).toBe(false)
    expect(wrapper.findAll('.prompt-item')).toHaveLength(1)
  })

  it('an empty catalog says so instead of showing a blank list', async () => {
    fn.__setCallable('getAiPromptCatalog', () => ({ prompts: [] }))
    const wrapper = mount(PromptsSection)
    await flushPromises()
    expect(wrapper.text()).toContain('目前沒有可編輯的 Prompt')
  })
})
