<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getVerificationById,
  listAllVehicles,
  listUserProfiles,
  listVerificationAnswers,
  type AdminUserProfile,
  type AdminVerificationDetail,
} from '../services/admin-data.service'
import { findItemById } from '@/data/verification'
import { aiVisionItemTitle } from '@/data/verification/ai-vision-items'
import type { Vehicle } from '@/types/vehicle'
import type { VerificationAnswer } from '@/types/verification-evidence'

const props = defineProps<{ id?: string }>()
const router = useRouter()

const loading = ref(true)
const verification = ref<AdminVerificationDetail | null>(null)
const vehicle = ref<Vehicle | null>(null)
const submitter = ref<AdminUserProfile | null>(null)
const answers = ref<VerificationAnswer[]>([])

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  in_progress: '進行中',
  completed: '已完成',
  needs_review: '待複核',
  expired: '已過期',
}
const TYPE_LABEL: Record<string, string> = {
  seller: '賣家驗證',
  buyer: '買家複驗',
  professional: '專業檢驗',
}
const RESULT_LABEL: Record<string, string> = {
  normal: '正常',
  attention: '需要注意',
  unsure: '不確定',
  not_applicable: '不適用',
}
const RESULT_TONE: Record<string, 'ok' | 'attn' | 'mute'> = {
  normal: 'ok',
  attention: 'attn',
  unsure: 'mute',
  not_applicable: 'mute',
}

function formatDate(ms?: number): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('zh-TW')
}

/** Checklist items (APR-xxx, ENG-xxx, ...) resolve via the flow definition;
 * Group A/B/C AI-vision items (rear_brake_condition etc.) have no checklist
 * itemId at all — they resolve via their own shared title map instead (see
 * ai-vision-items.ts). The raw id still shows separately (`.answer-id` span
 * below) so admin can always see exactly which AI category produced this
 * verdict, even once the title is human-readable. */
function itemTitle(itemId: string): string {
  const kind = verification.value?.type === 'buyer' ? 'buyer' : 'seller'
  return findItemById(kind, itemId)?.title ?? aiVisionItemTitle(itemId) ?? itemId
}

const sortedAnswers = computed(() =>
  [...answers.value].sort((a, b) => a.itemId.localeCompare(b.itemId)),
)
const aiAnsweredCount = computed(() => answers.value.filter((a) => a.aiResult).length)

onMounted(async () => {
  if (!props.id) {
    loading.value = false
    return
  }
  const ver = await getVerificationById(props.id)
  verification.value = ver
  if (ver) {
    const [vehicles, users, ans] = await Promise.all([
      listAllVehicles(),
      listUserProfiles(),
      listVerificationAnswers(props.id),
    ])
    vehicle.value = vehicles.find((v) => v.id === ver.vehicleId) ?? null
    submitter.value = users.find((u) => u.uid === ver.userId) ?? null
    answers.value = ans
  }
  loading.value = false
})
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel-head">
      <h2>檢驗詳情</h2>
      <div class="spacer"></div>
      <button class="admin-btn sm" @click="router.push('/admin/verify')">返回檢驗任務</button>
    </div>

    <p v-if="loading" class="admin-page-intro" style="padding: 17px">載入中...</p>
    <p v-else-if="!verification" class="admin-page-intro" style="padding: 17px">
      找不到這筆驗證紀錄。
    </p>

    <div v-else class="admin-udetail">
      <div class="admin-uside">
        <div class="admin-uname">{{ vehicle ? `${vehicle.brand} ${vehicle.model}` : '（找不到車輛）' }}</div>
        <div class="admin-ucode">{{ submitter?.displayName || submitter?.email || verification.userId.slice(0, 8) }}</div>

        <dl class="admin-ufacts">
          <div>
            <dt>驗證 ID</dt>
            <dd class="mono">{{ verification.id.slice(0, 12) }}…</dd>
          </div>
          <div>
            <dt>類型</dt>
            <dd>{{ TYPE_LABEL[verification.type] ?? verification.type }}</dd>
          </div>
          <div>
            <dt>狀態</dt>
            <dd>
              <span
                class="admin-pill"
                :class="
                  verification.status === 'completed'
                    ? 'ok'
                    : verification.status === 'needs_review'
                      ? 'attn'
                      : 'mute'
                "
                >{{ STATUS_LABEL[verification.status] ?? verification.status }}</span
              >
            </dd>
          </div>
          <div>
            <dt>建立時間</dt>
            <dd>{{ formatDate(verification.createdAt) }}</dd>
          </div>
          <div>
            <dt>完成時間</dt>
            <dd>{{ formatDate(verification.completedAt) }}</dd>
          </div>
          <div>
            <dt>公開報告</dt>
            <dd>{{ verification.isPublic ? '是' : '否' }}</dd>
          </div>
          <div>
            <dt>項目總數 / 有 AI 回應</dt>
            <dd>{{ answers.length }} / {{ aiAnsweredCount }}</dd>
          </div>
        </dl>
      </div>

      <div class="admin-umain">
        <div v-if="verification.environmentContext" class="admin-usec">
          <h3>驗車環境檢測 <span class="admin-ref app">PREP-03 · environmentContext</span></h3>
          <dl class="admin-kv">
            <div>
              <dt>整體適合度</dt>
              <dd>
                <span
                  class="admin-pill"
                  :class="(verification.environmentContext as any).quality?.overallSuitable ? 'ok' : 'attn'"
                >
                  {{
                    (verification.environmentContext as any).quality?.overallSuitable
                      ? '適合'
                      : '不適合'
                  }}
                </span>
              </dd>
            </div>
            <div>
              <dt>模型</dt>
              <dd class="mono">{{ (verification.environmentContext as any).model }}</dd>
            </div>
            <div v-if="((verification.environmentContext as any).warnings ?? []).length > 0">
              <dt>警示</dt>
              <dd>{{ ((verification.environmentContext as any).warnings as string[]).join('、') }}</dd>
            </div>
          </dl>
          <pre class="admin-json">{{ JSON.stringify(verification.environmentContext, null, 2) }}</pre>
        </div>

        <div v-if="verification.coldStateContext" class="admin-usec">
          <h3>冷車狀態確認 <span class="admin-ref app">ENG-02 · coldStateContext</span></h3>
          <dl class="admin-kv">
            <div>
              <dt>冷車資料有效</dt>
              <dd>
                <span
                  class="admin-pill"
                  :class="(verification.coldStateContext as any).coldStateValid ? 'ok' : 'attn'"
                >
                  {{ (verification.coldStateContext as any).coldStateValid ? '有效' : '無效' }}
                </span>
              </dd>
            </div>
            <div>
              <dt>判定結果</dt>
              <dd>{{ (verification.coldStateContext as any).coldEngineTouchCheck }}</dd>
            </div>
          </dl>
          <pre class="admin-json">{{ JSON.stringify(verification.coldStateContext, null, 2) }}</pre>
        </div>

        <div class="admin-usec">
          <h3>各項目結果與 AI 回應 <span class="admin-ref app">collection: answers</span></h3>
          <div v-if="sortedAnswers.length === 0" class="admin-slot">尚無任何項目回答</div>
          <div v-else class="answer-list">
            <div v-for="answer in sortedAnswers" :key="answer.itemId" class="answer-card">
              <div class="answer-head">
                <span class="mono answer-id">{{ answer.itemId }}</span>
                <span class="answer-title">{{ itemTitle(answer.itemId) }}</span>
                <span class="admin-pill" :class="RESULT_TONE[answer.result] ?? 'mute'">
                  {{ RESULT_LABEL[answer.result] ?? answer.result }}
                </span>
              </div>
              <p v-if="answer.note" class="answer-note">使用者備註：{{ answer.note }}</p>

              <div v-if="answer.aiResult" class="ai-block">
                <dl class="admin-kv">
                  <div>
                    <dt>模型</dt>
                    <dd class="mono">{{ answer.aiResult.model }} ({{ answer.aiResult.modelVersion }})</dd>
                  </div>
                  <div>
                    <dt>信心值</dt>
                    <dd>{{ answer.aiResult.confidence ?? '—' }}</dd>
                  </div>
                  <div>
                    <dt>標籤</dt>
                    <dd>{{ answer.aiResult.label }}</dd>
                  </div>
                  <div v-if="answer.aiResult.details.note">
                    <dt>AI 說明</dt>
                    <dd>{{ answer.aiResult.details.note }}</dd>
                  </div>
                  <div v-if="(answer.aiResult.details.findings ?? []).length > 0">
                    <dt>觀察項目</dt>
                    <dd>{{ (answer.aiResult.details.findings ?? []).join('、') }}</dd>
                  </div>
                  <div v-if="answer.aiResult.details.attempts.length > 1">
                    <dt>重試次數</dt>
                    <dd>{{ answer.aiResult.details.finalAttempt }} / {{ answer.aiResult.details.attempts.length }}</dd>
                  </div>
                </dl>
                <details class="ai-raw">
                  <summary>完整 AI 回應（JSON）</summary>
                  <pre class="admin-json">{{ JSON.stringify(answer.aiResult, null, 2) }}</pre>
                </details>
              </div>
              <p v-else class="answer-manual">人工判定項目，無 AI 回應。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-kv {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 8px;
}

.admin-kv div {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.admin-kv dt {
  flex: 0 0 auto;
  min-width: 90px;
  color: var(--muted);
}

.admin-kv dd {
  margin: 0;
  flex: 1;
}

.admin-json {
  margin: 0;
  padding: 10px 12px;
  background: var(--ground);
  border-radius: 8px;
  font-size: 11.5px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre;
}

.answer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.answer-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.answer-id {
  font-size: 12px;
}

.answer-title {
  font-weight: 600;
  flex: 1;
}

.answer-note {
  margin: 0;
  font-size: 12.5px;
  color: var(--muted);
}

.answer-manual {
  margin: 0;
  font-size: 12.5px;
  color: var(--muted);
  font-style: italic;
}

.ai-block {
  border-top: 1px dashed var(--line);
  padding-top: 6px;
}

.ai-raw summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--action);
}
</style>
