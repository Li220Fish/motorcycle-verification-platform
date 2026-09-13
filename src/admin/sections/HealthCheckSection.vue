<script setup lang="ts">
/**
 * 健檢標記 — admin subsystem for manually placing the 13/14-item marker
 * anchors of 基本13項健檢 (BasicHealthCheck13.vue) onto each vehicle model's
 * own 範例圖片, replacing the old one-size-fits-all hardcoded coordinates.
 * Four panes: 總覽 (list + paths + status), 批次上傳範例圖片 (bulk photo
 * upload matched by filename), 標註 + 預覽 (shown together once a model is
 * selected, since the preview must reflect the editor's live unsaved draft).
 */
import { computed, reactive, ref } from 'vue'

import {
  listVehicleModels,
  setVehicleModelCoverImage,
  setVehicleModelHealthCheckAnchors,
  type AdminVehicleModel,
} from '../services/admin-data.service'
import HealthCheckAnnotationEditor from './HealthCheckAnnotationEditor.vue'
import HealthCheckAnnotationPreview from './HealthCheckAnnotationPreview.vue'
import { storageService } from '@/services/firebase/storage.service'
import { imageCompressionService } from '@/services/media/image-compression.service'
import {
  computeHealthCheckAnnotationStatus,
  type HealthCheckAnchor,
  type HealthCheckAnnotationStatus,
} from '@/data/verification/basic-health-check-items'

const loading = ref(true)
const models = ref<AdminVehicleModel[]>([])
const selectedModelId = ref<string | null>(null)
const draftAnchors = ref<Record<string, HealthCheckAnchor>>({})
const view = ref<'list' | 'batch'>('list')

const selectedModel = computed(
  () => models.value.find((m) => m.id === selectedModelId.value) ?? null,
)

async function reload(): Promise<void> {
  models.value = await listVehicleModels()
}

// --- 窗格1：總覽 ---

const searchText = ref('')
const statusFilter = ref<'all' | HealthCheckAnnotationStatus>('all')

const STATUS_LABEL: Record<HealthCheckAnnotationStatus, string> = {
  none: '尚未標註',
  partial: '部分完成',
  complete: '已完成',
}

function statusOf(m: AdminVehicleModel) {
  return computeHealthCheckAnnotationStatus(m.healthCheckAnchors, m.hasChain)
}

const filteredModels = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  return models.value.filter((m) => {
    if (q) {
      const hay = [m.brand, m.series, m.trimName ?? ''].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (statusFilter.value !== 'all' && statusOf(m).status !== statusFilter.value) return false
    return true
  })
})

function openModel(id: string): void {
  selectedModelId.value = id
}

function closeModel(): void {
  selectedModelId.value = null
}

// --- 窗格3/4：標註＋預覽 ---

function handleEditorUpdate(anchors: Record<string, HealthCheckAnchor>): void {
  draftAnchors.value = anchors
}

async function handleEditorSave(anchors: Record<string, HealthCheckAnchor>): Promise<void> {
  if (!selectedModelId.value) return
  await setVehicleModelHealthCheckAnchors(selectedModelId.value, anchors)
  await reload()
}

// --- 窗格2：批次上傳範例圖片 ---

/** Matches the filename convention 品牌＋series＋trimName＿年式 (e.g.
 *  HONDA_CB_650R_2022.jpg) — normalized aggressively (lowercased, every
 *  separator stripped) so admins don't need to remember an exact separator
 *  style; "HONDA_CB_650R_2022", "Honda CB 650R_2022" and "hondacb650r2022"
 *  all match the same model. */
function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '')
}

function modelMatchKey(m: AdminVehicleModel): string {
  return normalizeForMatch(`${m.brand}${m.series}${m.trimName ?? ''}${m.modelYear ?? ''}`)
}

interface BatchRow {
  file: File
  previewUrl: string
  matchedModelId: string | null
}
type BatchRowState = 'idle' | 'uploading' | 'done' | 'error'

const batchRows = ref<BatchRow[]>([])
const batchStatus = reactive<Record<number, { state: BatchRowState; message?: string }>>({})
const batchRunning = ref(false)

function addFiles(fileList: FileList | File[]): void {
  const files = Array.from(fileList)
  const newRows = files.map((file) => {
    const base = file.name.replace(/\.[^.]+$/, '')
    const normalized = normalizeForMatch(base)
    const matched = models.value.find((m) => modelMatchKey(m) === normalized)
    return { file, previewUrl: URL.createObjectURL(file), matchedModelId: matched?.id ?? null }
  })
  batchRows.value = [...batchRows.value, ...newRows]
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files)
}

function handleFileInput(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.files?.length) addFiles(input.files)
  input.value = ''
}

function removeBatchRow(index: number): void {
  URL.revokeObjectURL(batchRows.value[index].previewUrl)
  batchRows.value.splice(index, 1)
  delete batchStatus[index]
}

function modelLabel(id: string | null): string {
  const m = models.value.find((mm) => mm.id === id)
  if (!m) return ''
  return `${m.brand} ${m.series} ${m.trimName ?? ''}${m.modelYear ? ` (${m.modelYear})` : ''}`
}

const canConfirmBatch = computed(
  () => batchRows.value.length > 0 && batchRows.value.every((r) => r.matchedModelId),
)

async function confirmBatchUpload(): Promise<void> {
  batchRunning.value = true
  for (let i = 0; i < batchRows.value.length; i++) {
    const row = batchRows.value[i]
    if (!row.matchedModelId) continue
    batchStatus[i] = { state: 'uploading' }
    try {
      let blob: Blob = row.file
      try {
        const compressed = await imageCompressionService.compressImage(row.file)
        blob = compressed.blob
      } catch (compressionError) {
        console.error(
          '[HealthCheckSection] batch compression failed, using original',
          compressionError,
        )
      }
      const url = await storageService.uploadVehicleModelPhoto(row.matchedModelId, blob)
      await setVehicleModelCoverImage(row.matchedModelId, url)
      batchStatus[i] = { state: 'done' }
    } catch (error) {
      batchStatus[i] = {
        state: 'error',
        message: error instanceof Error ? error.message : '上傳失敗',
      }
    }
  }
  batchRunning.value = false
  await reload()
}

function clearBatch(): void {
  batchRows.value.forEach((r) => URL.revokeObjectURL(r.previewUrl))
  batchRows.value = []
  Object.keys(batchStatus).forEach((k) => delete batchStatus[Number(k)])
}

reload().then(() => {
  loading.value = false
})
</script>

<template>
  <div>
    <p class="admin-page-intro">
      為每個車款標註「基本13項健檢」（<code>vehicleModels.healthCheckAnchors</code>）在其專屬範例圖片上的標記位置，取代原本所有車款共用同一組座標的寫死方式。若該車款「鏈條傳動」為是，會多出第14項「鏈條」。
    </p>

    <div v-if="selectedModel" class="annotate-wrap">
      <div class="annotate-head">
        <button class="admin-btn sm" @click="closeModel">← 返回總覽</button>
        <h3>
          {{ selectedModel.brand }} {{ selectedModel.series }}
          <span v-if="selectedModel.trimName">{{ selectedModel.trimName }}</span>
          <span v-if="selectedModel.modelYear" class="dim"> ({{ selectedModel.modelYear }})</span>
        </h3>
      </div>
      <div class="annotate-split">
        <HealthCheckAnnotationEditor
          :key="selectedModel.id"
          :model="selectedModel"
          @update="handleEditorUpdate"
          @save="handleEditorSave"
        />
        <div class="preview-col">
          <h4>預覽（即時反映尚未儲存的變更）</h4>
          <HealthCheckAnnotationPreview :model="selectedModel" :draft-anchors="draftAnchors" />
        </div>
      </div>
    </div>

    <template v-else>
      <div class="admin-filters" style="margin-bottom: 14px">
        <button class="admin-chip" :class="{ active: view === 'list' }" @click="view = 'list'">
          總覽
        </button>
        <button class="admin-chip" :class="{ active: view === 'batch' }" @click="view = 'batch'">
          批次上傳範例圖片
        </button>
      </div>

      <div v-if="view === 'list'" class="admin-panel">
        <div class="admin-panel-head">
          <h2>車款清單</h2>
          <input
            v-model="searchText"
            type="search"
            class="admin-search"
            placeholder="搜尋廠牌、車系、名稱..."
          />
          <select v-model="statusFilter" class="admin-btn sm">
            <option value="all">全部狀態</option>
            <option value="none">尚未標註</option>
            <option value="partial">部分完成</option>
            <option value="complete">已完成</option>
          </select>
        </div>
        <div class="admin-panel-body flush admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>範例圖片</th>
                <th>車款</th>
                <th>Storage 路徑</th>
                <th>標註狀態</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!loading && filteredModels.length === 0">
                <td class="admin-empty-cell" colspan="4">尚無資料</td>
              </tr>
              <tr
                v-for="m in filteredModels"
                :key="m.id"
                class="clickable"
                @click="openModel(m.id)"
              >
                <td>
                  <img
                    v-if="m.coverImageUrl"
                    :src="m.coverImageUrl"
                    alt=""
                    style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px"
                  />
                  <span v-else class="admin-pill mute">無圖片</span>
                </td>
                <td class="strong">
                  {{ m.brand }} {{ m.series }}<span v-if="m.trimName"> {{ m.trimName }}</span>
                  <span v-if="m.modelYear" class="dim"> ({{ m.modelYear }})</span>
                </td>
                <td class="dim mono">
                  {{ m.coverImageUrl ? `vehicleModels/${m.id}/...` : '—' }}
                </td>
                <td>
                  <span
                    class="admin-pill"
                    :class="{
                      ok: statusOf(m).status === 'complete',
                      info: statusOf(m).status === 'partial',
                      mute: statusOf(m).status === 'none',
                    }"
                  >
                    {{ STATUS_LABEL[statusOf(m).status] }}
                    <template v-if="statusOf(m).status !== 'none'">
                      {{ statusOf(m).done }}/{{ statusOf(m).total }}
                    </template>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="admin-panel">
        <div class="admin-panel-head">
          <h2>批次上傳範例圖片</h2>
          <span class="admin-ref"
            >檔名比對規則：品牌＋series＋trimName＿年式，例如 HONDA_CB_650R_2022.jpg</span
          >
        </div>
        <div class="admin-panel-body">
          <div class="drop-zone" @dragover.prevent @drop="handleDrop">
            <p>將 .jpg 檔案拖曳到這裡，或</p>
            <input type="file" accept="image/jpeg" multiple @change="handleFileInput" />
          </div>

          <table v-if="batchRows.length > 0" class="admin-table" style="margin-top: 14px">
            <thead>
              <tr>
                <th>預覽</th>
                <th>檔名</th>
                <th>比對車款</th>
                <th>狀態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in batchRows" :key="i">
                <td>
                  <img
                    :src="row.previewUrl"
                    alt=""
                    style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px"
                  />
                </td>
                <td class="dim mono">{{ row.file.name }}</td>
                <td>
                  <select v-model="row.matchedModelId">
                    <option :value="null">— 未比對，請手動選擇 —</option>
                    <option v-for="m in models" :key="m.id" :value="m.id">
                      {{ m.brand }} {{ m.series }} {{ m.trimName }}
                      <template v-if="m.modelYear">({{ m.modelYear }})</template>
                    </option>
                  </select>
                  <p v-if="row.matchedModelId" class="admin-field-hint" style="margin-top: 2px">
                    {{ modelLabel(row.matchedModelId) }}
                  </p>
                </td>
                <td>
                  <span
                    v-if="batchStatus[i]"
                    class="admin-pill"
                    :class="{
                      ok: batchStatus[i].state === 'done',
                      risk: batchStatus[i].state === 'error',
                      info: batchStatus[i].state === 'uploading',
                    }"
                  >
                    {{
                      { idle: '待上傳', uploading: '上傳中...', done: '完成', error: '失敗' }[
                        batchStatus[i].state
                      ]
                    }}
                  </span>
                  <span v-else class="admin-pill mute">待上傳</span>
                  <p v-if="batchStatus[i]?.message" class="admin-form-error">
                    {{ batchStatus[i].message }}
                  </p>
                  <button
                    v-if="batchStatus[i]?.state === 'done' && row.matchedModelId"
                    class="admin-btn sm"
                    style="margin-top: 4px"
                    @click="openModel(row.matchedModelId)"
                  >
                    前往標註
                  </button>
                </td>
                <td>
                  <button class="admin-btn sm danger" @click="removeBatchRow(i)">移除</button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="batchRows.length > 0" class="batch-actions">
            <button class="admin-btn" :disabled="batchRunning" @click="clearBatch">清除全部</button>
            <button
              class="admin-btn primary"
              :disabled="!canConfirmBatch || batchRunning"
              @click="confirmBatchUpload"
            >
              {{ batchRunning ? '上傳中...' : '確認上傳' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.annotate-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.annotate-head h3 {
  margin: 0;
  font-size: 15px;
}

.annotate-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 18px;
  align-items: start;
}

.preview-col h4 {
  margin: 0 0 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--muted);
}

.drop-zone {
  border: 1px dashed var(--line);
  border-radius: 10px;
  padding: 24px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.batch-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

@media (max-width: 1080px) {
  .annotate-split {
    grid-template-columns: 1fr;
  }
}
</style>
