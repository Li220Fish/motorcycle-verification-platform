<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  listAiPrompts,
  resetAiPromptOverride,
  setAiPromptOverride,
  type AdminAiPrompt,
} from '../services/admin-data.service'
import { PROMPT_ITEM_MAP } from '../services/prompt-item-map'
import { findItemById } from '@/data/verification'

const loading = ref(true)
const prompts = ref<AdminAiPrompt[]>([])
const selectedKey = ref<string | null>(null)
const draftText = ref('')
const saving = ref(false)
const resetting = ref(false)
const errorMessage = ref('')

const selected = computed(() => prompts.value.find((p) => p.key === selectedKey.value) ?? null)

const effectiveText = (prompt: AdminAiPrompt) => prompt.overrideText ?? prompt.defaultText

const isDirty = computed(
  () => !!selected.value && draftText.value !== effectiveText(selected.value),
)
const isEmpty = computed(() => draftText.value.trim().length === 0)

interface RelatedItem {
  id: string
  title: string
}

const relatedItems = computed<RelatedItem[]>(() => {
  if (!selected.value) return []
  const mapping = PROMPT_ITEM_MAP[selected.value.key]
  if (!mapping) return []
  return mapping.itemIds.map((id) => ({
    id,
    title: findItemById('seller', id)?.title ?? id,
  }))
})

const relatedNote = computed(() => PROMPT_ITEM_MAP[selected.value?.key ?? '']?.note)

function formatUpdatedAt(ms: number | null): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('zh-TW', { hour12: false })
}

function selectPrompt(prompt: AdminAiPrompt): void {
  selectedKey.value = prompt.key
  draftText.value = effectiveText(prompt)
  errorMessage.value = ''
}

async function reload(): Promise<void> {
  prompts.value = await listAiPrompts()
}

async function handleSave(): Promise<void> {
  if (!selected.value || !isDirty.value || isEmpty.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await setAiPromptOverride(selected.value.key, draftText.value)
    await reload()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '儲存失敗'
  } finally {
    saving.value = false
  }
}

async function handleReset(): Promise<void> {
  if (!selected.value) return
  resetting.value = true
  errorMessage.value = ''
  try {
    if (selected.value.overrideText !== null) {
      await resetAiPromptOverride(selected.value.key)
      await reload()
    }
    draftText.value = selected.value.defaultText
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '還原失敗'
  } finally {
    resetting.value = false
  }
}

onMounted(async () => {
  try {
    await reload()
    if (prompts.value.length > 0) selectPrompt(prompts.value[0])
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <p class="admin-page-intro">
      這裡管理實際打給 Gemini 的 Prompt 文字（<code>aiPrompts</code>
      collection）。每一項預設值來自後端程式碼；在這裡儲存會建立一份覆寫，之後這個項目的所有分析都會改用覆寫文字（最多延遲
      60
      秒生效，不需要重新部署）。「還原成預設」會刪除覆寫、改回程式碼內建的版本。修改前建議先確認文字語意正確——Prompt
      內容錯誤可能導致 AI 判定失準或整批分析失敗。
    </p>

    <div class="admin-guard amber">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path
          d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </svg>
      <div>
        <h4>直接影響正式環境</h4>
        <p>
          這裡沒有草稿/發布分流——儲存後立刻對所有使用者生效。建議先在其他地方擬好文字並確認過一次，再貼進來儲存。
        </p>
      </div>
    </div>

    <div class="admin-panel admin-udetail">
      <div class="admin-uside">
        <p v-if="loading" class="admin-page-intro" style="margin: 0">載入中...</p>
        <template v-else>
          <button
            v-for="prompt in prompts"
            :key="prompt.key"
            class="admin-nav-item prompt-item"
            :class="{ active: selectedKey === prompt.key }"
            @click="selectPrompt(prompt)"
          >
            <span class="admin-nav-label">{{ prompt.label }}</span>
            <span v-if="prompt.overrideText !== null" class="admin-pill info">已自訂</span>
          </button>
        </template>
      </div>

      <div class="admin-umain">
        <template v-if="selected">
          <div class="admin-usec">
            <h3>
              {{ selected.label }}
              <span class="admin-ref">{{ selected.key }}</span>
            </h3>
            <p class="admin-page-intro" style="margin: 0 0 10px">
              <span v-if="selected.overrideText !== null">
                已自訂・最後更新：{{ formatUpdatedAt(selected.updatedAt) }}（{{
                  selected.updatedBy ?? '未知'
                }}）
              </span>
              <span v-else>目前使用程式碼預設值，尚未被覆寫過。</span>
            </p>

            <div class="related-items">
              <span class="related-items-label">影響的檢測項目</span>
              <template v-if="relatedItems.length > 0">
                <span v-for="item in relatedItems" :key="item.id" class="admin-pill mute">
                  {{ item.title }}
                  <span class="mono related-item-id">{{ item.id }}</span>
                </span>
              </template>
              <span v-else-if="relatedNote" class="related-items-note">{{ relatedNote }}</span>
              <span v-else class="related-items-note">尚未建立對照。</span>
            </div>
          </div>

          <div class="admin-checker">
            <textarea v-model="draftText" rows="22" spellcheck="false"></textarea>
          </div>

          <p v-if="errorMessage" class="admin-word" style="align-self: flex-start">
            {{ errorMessage }}
          </p>

          <div class="admin-form-row">
            <button
              class="admin-btn primary"
              :disabled="saving || !isDirty || isEmpty"
              @click="handleSave"
            >
              {{ saving ? '儲存中...' : '儲存並套用' }}
            </button>
            <button
              class="admin-btn"
              :disabled="resetting || (selected.overrideText === null && !isDirty)"
              @click="handleReset"
            >
              {{ resetting ? '處理中...' : '還原成預設' }}
            </button>
          </div>
        </template>
        <p v-else class="admin-page-intro">尚無可編輯的 Prompt。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-item {
  border-radius: 8px;
  color: var(--text);
  justify-content: space-between;
  margin-bottom: 4px;
}

.prompt-item:hover {
  background: #eef1f5;
}

.prompt-item.active {
  background: var(--action-soft);
  color: var(--action);
  border-left-color: transparent;
  font-weight: 700;
}

.admin-checker textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
}

.related-items {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
}

.related-items-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  margin-right: 2px;
}

.related-item-id {
  margin-left: 4px;
  opacity: 0.7;
}

.related-items-note {
  font-size: 12px;
  color: var(--faint);
  font-style: italic;
}
</style>
