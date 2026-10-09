<script setup lang="ts">
/**
 * 訓練資料集 — review, annotate (YOLO26-OBB) and export the photos uploaded
 * by the developer capture app (capture-app/). Four tabs:
 *   覆蓋率   車款 × 部位 matrix, so collectors know what's still missing
 *   審核標注 oriented-box editor seeded from the capture guide frames
 *   採集人員 dataCollectors allowlist (who may upload)
 *   匯出     YOLO-OBB manifest for scripts/export-training-dataset.mjs
 */
import { computed, reactive, ref, watch } from 'vue'

import TrainingAnnotationEditor from './TrainingAnnotationEditor.vue'
import {
  listUserProfiles,
  listVehicleModels,
  type AdminUserProfile,
} from '../services/admin-data.service'
import {
  addDataCollector,
  buildObbManifest,
  captureImageUrl,
  listDataCollectors,
  listTrainingCaptures,
  listTrainingSessions,
  removeDataCollector,
  reclassifyCaptures,
  saveCaptureReview,
  type DataCollector,
  type VehicleClassification,
} from '../services/training-dataset.service'
import {
  VEHICLE_TYPE_LABEL,
  type TrainingAnnotation,
  type TrainingCapture,
  type TrainingCaptureStatus,
  type TrainingSession,
} from '@/data/training/training-dataset.types'
import { findTrainingShot, partLabel, TRAINING_PART_LABELS } from '@/data/training/training-shots'

/** Below this many approved photos per 車款 × 部位, a cell is "不足". */
const MIN_PER_CELL = 3

type Tab = 'coverage' | 'review' | 'collectors' | 'export'
const tab = ref<Tab>('review')
const loading = ref(true)
const captures = ref<TrainingCapture[]>([])
const sessions = ref<TrainingSession[]>([])

async function reload(): Promise<void> {
  ;[captures.value, sessions.value] = await Promise.all([
    listTrainingCaptures(),
    listTrainingSessions(),
  ])
}

/** Phone sessions start unclassified (shoot first, classify here). */
const UNCLASSIFIED = 'unclassified'
const vehicleName = (c: { vehicleModelLabel: string }) => c.vehicleModelLabel || '未分類'
const modelKey = (c: { vehicleModelId: string | null; vehicleModelLabel: string }) =>
  c.vehicleModelId ?? (c.vehicleModelLabel ? `label:${c.vehicleModelLabel}` : UNCLASSIFIED)

const counts = computed(() => ({
  total: captures.value.length,
  pending: captures.value.filter((c) => c.status === 'pending').length,
  approved: captures.value.filter((c) => c.status === 'approved').length,
  rejected: captures.value.filter((c) => c.status === 'rejected').length,
  boxes: captures.value
    .filter((c) => c.status === 'approved')
    .reduce((n, c) => n + (c.annotations?.length ?? 0), 0),
}))

// --- 覆蓋率 ---

const coverage = computed(() => {
  const rows = new Map<
    string,
    { label: string; type: string; cells: Record<string, { approved: number; total: number }> }
  >()
  for (const c of captures.value) {
    if (c.status === 'rejected') continue
    const key = modelKey(c)
    if (!rows.has(key))
      rows.set(key, {
        label: vehicleName(c),
        type: VEHICLE_TYPE_LABEL[c.vehicleType],
        cells: {},
      })
    const row = rows.get(key)!
    // A photo counts for every part annotated in it, not only its shot's part.
    const parts = new Set([c.partKey, ...(c.annotations ?? c.guideAnnotations).map((a) => a.label)])
    for (const p of parts) {
      const cell = (row.cells[p] ??= { approved: 0, total: 0 })
      cell.total++
      if (c.status === 'approved') cell.approved++
    }
  }
  return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
})

// --- 審核標注 ---

const statusFilter = ref<'all' | TrainingCaptureStatus>('pending')
const modelFilter = ref('all')
const partFilter = ref('all')

const modelOptions = computed(() => {
  const m = new Map<string, string>()
  captures.value.forEach((c) => {
    if (modelKey(c) !== UNCLASSIFIED) m.set(modelKey(c), vehicleName(c))
  })
  return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'zh-Hant'))
})

const filtered = computed(() =>
  captures.value.filter(
    (c) =>
      (statusFilter.value === 'all' || c.status === statusFilter.value) &&
      (modelFilter.value === 'all' || modelKey(c) === modelFilter.value) &&
      (partFilter.value === 'all' || c.partKey === partFilter.value),
  ),
)

const selectedId = ref<string | null>(null)
const selected = computed(() => captures.value.find((c) => c.id === selectedId.value) ?? null)
const thumbs = reactive<Record<string, string>>({})
const saving = ref(false)
const saveError = ref('')

watch(
  filtered,
  (list) => {
    if (!list.find((c) => c.id === selectedId.value)) selectedId.value = list[0]?.id ?? null
    // Resolve thumbnails for what's on screen (list is capped below).
    list.slice(0, 80).forEach((c) => {
      if (!thumbs[c.storagePath]) {
        captureImageUrl(c.storagePath)
          .then((u) => (thumbs[c.storagePath] = u))
          .catch(() => undefined)
      }
    })
  },
  { immediate: true },
)

function step(delta: number): void {
  const list = filtered.value
  const i = list.findIndex((c) => c.id === selectedId.value)
  const next = list[i + delta]
  if (next) selectedId.value = next.id
}

const catalog = ref<{ id: string; label: string; bodyType: string | null; hasChain: boolean }[]>([])
listVehicleModels()
  .then((ms) => {
    catalog.value = ms
      .map((m) => ({
        id: m.id,
        label: [m.brand, m.series, m.trimName, m.modelYear ? `(${m.modelYear})` : '']
          .filter(Boolean)
          .join(' '),
        bodyType: m.bodyType,
        hasChain: m.hasChain,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
  })
  .catch(() => undefined)

async function handleReclassify(
  vehicle: VehicleClassification,
  wholeSession: boolean,
): Promise<void> {
  const cap = selected.value
  if (!cap) return
  const targets = wholeSession ? captures.value.filter((c) => c.sessionId === cap.sessionId) : [cap]
  saving.value = true
  saveError.value = ''
  try {
    await reclassifyCaptures(
      targets.map((c) => c.id),
      wholeSession ? cap.sessionId : null,
      vehicle,
    )
    targets.forEach((c) => Object.assign(c, vehicle))
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : '分類失敗'
  } finally {
    saving.value = false
  }
}

async function handleSave(
  annotations: TrainingAnnotation[],
  status: TrainingCaptureStatus,
  rejectReason: string | null,
): Promise<void> {
  const cap = selected.value
  if (!cap) return
  saving.value = true
  saveError.value = ''
  try {
    await saveCaptureReview(cap.id, { annotations, status, rejectReason })
    // Patch locally instead of reloading — keeps the filtered list stable
    // until the reviewer moves on (approved photos then drop out of 待審).
    Object.assign(cap, { annotations, status, rejectReason, reviewedAt: Date.now() })
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : '儲存失敗'
  } finally {
    saving.value = false
  }
}

const STATUS_LABEL: Record<TrainingCaptureStatus, string> = {
  pending: '待審',
  approved: '已核准',
  rejected: '已退回',
}

// --- 採集人員 ---

const collectors = ref<DataCollector[]>([])
const users = ref<AdminUserProfile[]>([])
const addUid = ref('')
const collectorBusy = ref(false)

async function loadCollectors(): Promise<void> {
  ;[collectors.value, users.value] = await Promise.all([listDataCollectors(), listUserProfiles()])
}
const addableUsers = computed(() =>
  users.value
    .filter((u) => !collectors.value.some((c) => c.uid === u.uid))
    .sort((a, b) => a.email.localeCompare(b.email)),
)
const sessionCountBy = computed(() => {
  const m: Record<string, number> = {}
  sessions.value.forEach((s) => (m[s.collectorUid] = (m[s.collectorUid] ?? 0) + 1))
  return m
})

async function addCollector(): Promise<void> {
  const u = users.value.find((x) => x.uid === addUid.value)
  if (!u) return
  collectorBusy.value = true
  await addDataCollector(u.uid, u.email)
  addUid.value = ''
  await loadCollectors()
  collectorBusy.value = false
}

async function removeCollector(uid: string): Promise<void> {
  if (!confirm('移除後此帳號無法再上傳訓練照片（已上傳的不受影響）。確定？')) return
  await removeDataCollector(uid)
  await loadCollectors()
}

watch(tab, (t) => {
  if (t === 'collectors' && !users.value.length) void loadCollectors()
})

// --- 匯出 ---

const manifest = computed(() => buildObbManifest(captures.value))
const perClass = computed(() => {
  const m: Record<string, number> = {}
  for (const img of manifest.value.images) {
    for (const line of img.labels) {
      const k = manifest.value.keys[Number(line.split(' ')[0])]
      m[k] = (m[k] ?? 0) + 1
    }
  }
  return m
})

function downloadManifest(): void {
  const blob = new Blob([JSON.stringify(manifest.value, null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `ride-obb-manifest-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

const previewLines = computed(() => {
  const img = manifest.value.images[0]
  return img ? [`# labels/${img.captureId}.txt`, ...img.labels].join('\n') : '# 尚無已核准的照片'
})

reload().then(() => (loading.value = false))
</script>

<template>
  <div>
    <p class="admin-page-intro">
      開發者用「訓練資料採集」App（<code>/capture/</code>）依 12
      項健檢部位對框拍攝的照片會出現在這裡。審核並修正旋轉框（OBB）後核准，即可匯出成 YOLO26-OBB
      訓練資料。
    </p>

    <dl class="admin-strip">
      <div>
        <dt>已上傳</dt>
        <dd>{{ loading ? '—' : counts.total }}</dd>
      </div>
      <div>
        <dt>待審</dt>
        <dd>{{ loading ? '—' : counts.pending }}</dd>
      </div>
      <div>
        <dt>已核准</dt>
        <dd>{{ loading ? '—' : counts.approved }}</dd>
        <div class="note">可匯出訓練</div>
      </div>
      <div>
        <dt>已退回</dt>
        <dd>{{ loading ? '—' : counts.rejected }}</dd>
      </div>
      <div>
        <dt>標注框</dt>
        <dd>{{ loading ? '—' : counts.boxes }}</dd>
        <div class="note">已核准照片中</div>
      </div>
    </dl>

    <div class="admin-filters" style="margin-bottom: 14px">
      <button class="admin-chip" :class="{ active: tab === 'review' }" @click="tab = 'review'">
        審核標注
      </button>
      <button class="admin-chip" :class="{ active: tab === 'coverage' }" @click="tab = 'coverage'">
        資料覆蓋率
      </button>
      <button
        class="admin-chip"
        :class="{ active: tab === 'collectors' }"
        @click="tab = 'collectors'"
      >
        採集人員
      </button>
      <button class="admin-chip" :class="{ active: tab === 'export' }" @click="tab = 'export'">
        匯出 YOLO26-OBB
      </button>
    </div>

    <!-- 審核標注 -->
    <div v-if="tab === 'review'" class="admin-panel">
      <div class="admin-panel-head">
        <h2>審核標注</h2>
        <select v-model="statusFilter" class="admin-btn sm">
          <option value="pending">待審</option>
          <option value="approved">已核准</option>
          <option value="rejected">已退回</option>
          <option value="all">全部狀態</option>
        </select>
        <select v-model="modelFilter" class="admin-btn sm">
          <option value="all">全部車款</option>
          <option :value="UNCLASSIFIED">
            未分類（{{ captures.filter((c) => modelKey(c) === UNCLASSIFIED).length }}）
          </option>
          <option v-for="[k, l] in modelOptions" :key="k" :value="k">{{ l }}</option>
        </select>
        <select v-model="partFilter" class="admin-btn sm">
          <option value="all">全部部位</option>
          <option v-for="p in TRAINING_PART_LABELS" :key="p.key" :value="p.key">
            {{ p.label }}
          </option>
        </select>
        <span class="admin-ref">{{ filtered.length }} 張</span>
        <span v-if="saving" class="admin-ref">儲存中…</span>
        <span v-if="saveError" class="admin-pill risk">{{ saveError }}</span>
      </div>
      <div class="admin-panel-body review">
        <div class="reclist">
          <button
            v-for="c in filtered.slice(0, 80)"
            :key="c.id"
            type="button"
            class="rec"
            :class="{ sel: c.id === selectedId }"
            @click="selectedId = c.id"
          >
            <img v-if="thumbs[c.storagePath]" :src="thumbs[c.storagePath]" alt="" />
            <span v-else class="ph"></span>
            <span class="rec-text">
              <span class="t" :class="{ unc: !c.vehicleModelLabel }">{{ vehicleName(c) }}</span>
              <span class="s">{{ findTrainingShot(c.shotId)?.title ?? c.shotId }}</span>
              <span class="s">
                {{ STATUS_LABEL[c.status] }}
                <template v-if="c.quality.warnings.length">
                  · ⚠ {{ c.quality.warnings.join('、') }}</template
                >
              </span>
            </span>
          </button>
          <p v-if="filtered.length > 80" class="dim">只顯示前 80 張，請用篩選縮小範圍。</p>
          <p v-if="!loading && !filtered.length" class="dim">沒有符合條件的照片。</p>
        </div>
        <TrainingAnnotationEditor
          v-if="selected"
          :key="selected.id"
          :capture="selected"
          :image-url="thumbs[selected.storagePath] ?? null"
          :models="catalog"
          @save="handleSave"
          @reclassify="handleReclassify"
          @prev="step(-1)"
          @next="step(1)"
        />
      </div>
    </div>

    <!-- 覆蓋率 -->
    <div v-else-if="tab === 'coverage'" class="admin-panel">
      <div class="admin-panel-head">
        <h2>資料覆蓋率（車款 × 部位）</h2>
        <span class="admin-ref"
          >每格「已核准 / 全部（不含退回）」；已核准滿 {{ MIN_PER_CELL }} 張才算足夠</span
        >
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table cov">
          <thead>
            <tr>
              <th>車款</th>
              <th v-for="p in TRAINING_PART_LABELS" :key="p.key">{{ p.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!coverage.length">
              <td class="admin-empty-cell" :colspan="TRAINING_PART_LABELS.length + 1">尚無資料</td>
            </tr>
            <tr v-for="row in coverage" :key="row.label">
              <td class="strong">
                {{ row.label }} <span class="dim">{{ row.type }}</span>
              </td>
              <td v-for="p in TRAINING_PART_LABELS" :key="p.key">
                <span
                  class="cell"
                  :class="
                    (row.cells[p.key]?.approved ?? 0) >= MIN_PER_CELL
                      ? 'f'
                      : row.cells[p.key]?.total
                        ? 'p'
                        : 'z'
                  "
                >
                  {{ row.cells[p.key]?.approved ?? 0
                  }}<small>/{{ row.cells[p.key]?.total ?? 0 }}</small>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 採集人員 -->
    <div v-else-if="tab === 'collectors'" class="admin-panel">
      <div class="admin-panel-head">
        <h2>採集人員</h2>
        <span class="admin-ref"
          >collection: dataCollectors — 只有名單內的帳號能從採集 App 上傳</span
        >
      </div>
      <div class="admin-panel-body">
        <div class="add-row">
          <select v-model="addUid" class="admin-btn sm">
            <option value="">選擇要加入的使用者…</option>
            <option v-for="u in addableUsers" :key="u.uid" :value="u.uid">
              {{ u.email || u.uid }}{{ u.displayName ? `（${u.displayName}）` : '' }}
            </option>
          </select>
          <button
            class="admin-btn sm primary"
            :disabled="!addUid || collectorBusy"
            @click="addCollector"
          >
            加入
          </button>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>uid</th>
              <th>採集車輛數</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!collectors.length">
              <td class="admin-empty-cell" colspan="4">尚無採集人員（管理員帳號預設可上傳）</td>
            </tr>
            <tr v-for="c in collectors" :key="c.uid">
              <td class="strong">{{ c.email || '—' }}</td>
              <td class="mono dim">{{ c.uid }}</td>
              <td>{{ sessionCountBy[c.uid] ?? 0 }}</td>
              <td>
                <button class="admin-btn sm danger" @click="removeCollector(c.uid)">移除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 匯出 -->
    <div v-else class="admin-panel">
      <div class="admin-panel-head">
        <h2>匯出 YOLO26-OBB</h2>
        <span class="admin-ref">只匯出已核准的照片；類別順序固定，請勿調整</span>
      </div>
      <div class="admin-panel-body export">
        <div>
          <p>
            已核准 <b>{{ manifest.images.length }}</b> 張、標注框
            <b>{{ manifest.images.reduce((n, i) => n + i.labels.length, 0) }}</b> 個。
          </p>
          <table class="admin-table">
            <thead>
              <tr>
                <th>class</th>
                <th>部件</th>
                <th>框數</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(k, i) in manifest.keys" :key="k">
                <td class="mono">{{ i }}</td>
                <td>{{ partLabel(k) }}</td>
                <td>{{ perClass[k] ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
          <button
            class="admin-btn primary"
            style="margin-top: 12px"
            :disabled="!manifest.images.length"
            @click="downloadManifest"
          >
            下載 manifest（JSON）
          </button>
        </div>
        <div>
          <h4>接下來</h4>
          <ol class="steps">
            <li>下載左側 manifest（標注已換算成 YOLO-OBB 四角點格式）。</li>
            <li>
              在專案根目錄執行，會下載照片並建立 Ultralytics 資料夾（含
              <code>data.yaml</code>，以車輛為單位切 train / val）：
              <pre>
npm run training:export -- --manifest ~/Downloads/ride-obb-manifest-….json --out datasets/ride-obb</pre>
            </li>
            <li>
              訓練：
              <pre>
python scripts/train_yolo26_obb.py --data datasets/ride-obb/data.yaml --model yolo26s-obb.pt</pre>
              手機端即時引導改用 <code>yolo26n-obb.pt</code>。
            </li>
          </ol>
          <h4>標注檔格式預覽</h4>
          <pre>{{ previewLines }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.reclist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 78vh;
  overflow-y: auto;
}

.rec {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  font: inherit;
  text-align: left;
  padding: 5px;
  border-radius: 8px;
  border: 1px solid var(--line-soft);
  background: var(--surface);
  cursor: pointer;
}

.rec.sel {
  border-color: var(--action);
  box-shadow: inset 0 0 0 1px var(--action);
}

.rec img,
.rec .ph {
  width: 42px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  background: var(--line-soft);
}

.rec-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rec .t {
  font-size: 12.5px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec .t.unc {
  color: var(--attention);
}

.rec .s {
  font-size: 11.5px;
  color: var(--muted);
}

.dim {
  color: var(--faint);
  font-size: 12px;
}

.cov th,
.cov td {
  text-align: center;
  white-space: nowrap;
}

.cov td:first-child {
  text-align: left;
}

.cell {
  display: inline-block;
  min-width: 34px;
  padding: 1px 5px;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}

.cell small {
  opacity: 0.7;
}

.cell.z {
  color: var(--faint);
}

.cell.p {
  background: var(--attention-soft);
  color: var(--attention);
}

.cell.f {
  background: var(--ok-soft);
  color: var(--ok);
}

.add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.add-row select {
  min-width: 320px;
}

.export {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 24px;
}

.export h4 {
  margin: 0 0 8px;
}

.steps {
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
}

pre {
  margin: 6px 0 0;
  padding: 8px 10px;
  background: var(--ground);
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 11.5px;
  overflow-x: auto;
  white-space: pre;
}
</style>
