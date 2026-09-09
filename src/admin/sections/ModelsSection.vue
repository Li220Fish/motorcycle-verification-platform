<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import {
  createVehicleModel,
  deleteVehicleModel,
  listVehicleModels,
  setVehicleModelCoverImage,
  updateVehicleModel,
  type AdminVehicleModel,
} from '../services/admin-data.service'
import { storageService } from '@/services/firebase/storage.service'
import { imageCompressionService } from '@/services/media/image-compression.service'

const loading = ref(true)
const models = ref<AdminVehicleModel[]>([])
const formOpen = ref(false)
const submitting = ref(false)
const editingId = ref<string | null>(null)
const searchText = ref('')

const filteredModels = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return models.value
  return models.value.filter((m) =>
    [m.brand, m.series, m.trimName ?? '', m.bodyType ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
})

// 廠牌/車系/車型類別 are open-ended vocabularies that grow as data is added —
// a <datalist> lets the admin pick an existing value or type a new one in
// the same text field, rather than needing a separate "other" escape hatch.
// 車系 is scoped to the currently-selected brand so it doesn't mix in every
// other brand's series names.
const brandOptions = computed(() =>
  Array.from(new Set(models.value.map((m) => m.brand))).sort(),
)
const seriesOptions = computed(() =>
  Array.from(
    new Set(models.value.filter((m) => m.brand === draft.brand).map((m) => m.series)),
  ).sort(),
)
const bodyTypeOptions = computed(() =>
  Array.from(new Set(models.value.map((m) => m.bodyType).filter((v): v is string => !!v))).sort(),
)

const CURRENT_YEAR = new Date().getFullYear()
const yearOptions = Array.from({ length: CURRENT_YEAR + 1 - 1990 + 1 }, (_, i) => CURRENT_YEAR + 1 - i)

const TRANSMISSION_OPTIONS = ['CVT', '鏈條', '皮帶', '軸傳動']

const draft = reactive({
  brand: '',
  series: '',
  modelYear: '',
  trimName: '',
  bodyType: '',
  powerType: 'gasoline' as 'gasoline' | 'electric',
  displacementCc: '',
  transmission: '',
  hasChain: false,
  synonymsText: '',
  maxPowerHp: '',
  maxTorqueKgm: '',
  fuelTankCapacityL: '',
  motorPowerW: '',
  weightKg: '',
  seatHeightMm: '',
  officialAverageKmPerL: '',
  abs: false,
  tcs: false,
  cbs: false,
})

// admin-typed sample photo for this model (see storageService.uploadVehicleModelPhoto) —
// separate from `draft` since a File isn't something v-model on a plain
// reactive object round-trips cleanly.
const photoFile = ref<File | null>(null)
const existingCoverImageUrl = ref<string | null>(null)
const photoPreviewUrl = ref<string | null>(null)

watch(photoFile, (file, _prev, onCleanup) => {
  if (!file) {
    photoPreviewUrl.value = null
    return
  }
  const url = URL.createObjectURL(file)
  photoPreviewUrl.value = url
  onCleanup(() => URL.revokeObjectURL(url))
})

function handlePhotoChange(event: Event): void {
  const input = event.target as HTMLInputElement
  photoFile.value = input.files?.[0] ?? null
}

// Picking 鏈條 as the transmission implies chain drive — auto-check the
// existing 鏈條傳動 box rather than making the admin set both. One-directional
// on purpose: switching away from 鏈條 afterward doesn't un-check it, since a
// bike can have an exposed chain independent of its stated transmission type.
watch(
  () => draft.transmission,
  (value) => {
    if (value === '鏈條') draft.hasChain = true
  },
)

const SYNONYM_SEPARATOR = /[、,，]/

function parseSynonyms(text: string): string[] {
  return text
    .split(SYNONYM_SEPARATOR)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function resetDraft(): void {
  draft.brand = ''
  draft.series = ''
  draft.modelYear = ''
  draft.trimName = ''
  draft.bodyType = ''
  draft.powerType = 'gasoline'
  draft.displacementCc = ''
  draft.transmission = ''
  draft.hasChain = false
  draft.synonymsText = ''
  draft.maxPowerHp = ''
  draft.maxTorqueKgm = ''
  draft.fuelTankCapacityL = ''
  draft.motorPowerW = ''
  draft.weightKg = ''
  draft.seatHeightMm = ''
  draft.officialAverageKmPerL = ''
  draft.abs = false
  draft.tcs = false
  draft.cbs = false
  photoFile.value = null
  existingCoverImageUrl.value = null
}

function numberOrNull(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

async function reload(): Promise<void> {
  models.value = await listVehicleModels()
}

function openCreateForm(): void {
  editingId.value = null
  resetDraft()
  formOpen.value = true
}

function openEditForm(model: AdminVehicleModel): void {
  editingId.value = model.id
  draft.brand = model.brand
  draft.series = model.series
  draft.modelYear = model.modelYear != null ? String(model.modelYear) : ''
  draft.trimName = model.trimName ?? ''
  draft.bodyType = model.bodyType ?? ''
  draft.powerType = model.powerType
  draft.displacementCc = model.displacementCc != null ? String(model.displacementCc) : ''
  draft.transmission = model.transmission ?? ''
  draft.hasChain = model.hasChain
  draft.maxPowerHp = model.specs.engine.maxPowerHp != null ? String(model.specs.engine.maxPowerHp) : ''
  draft.maxTorqueKgm =
    model.specs.engine.maxTorqueKgm != null ? String(model.specs.engine.maxTorqueKgm) : ''
  draft.fuelTankCapacityL =
    model.specs.engine.fuelTankCapacityL != null ? String(model.specs.engine.fuelTankCapacityL) : ''
  draft.motorPowerW = model.specs.electric.motorPowerW != null ? String(model.specs.electric.motorPowerW) : ''
  draft.weightKg = model.specs.dimensions.weightKg != null ? String(model.specs.dimensions.weightKg) : ''
  draft.seatHeightMm =
    model.specs.dimensions.seatHeightMm != null ? String(model.specs.dimensions.seatHeightMm) : ''
  draft.officialAverageKmPerL =
    model.specs.efficiency.officialAverageKmPerL != null
      ? String(model.specs.efficiency.officialAverageKmPerL)
      : ''
  draft.abs = model.specs.safety.abs
  draft.tcs = model.specs.safety.tcs
  draft.cbs = model.specs.safety.cbs
  draft.synonymsText = model.synonyms.join('、')
  photoFile.value = null
  existingCoverImageUrl.value = model.coverImageUrl
  formOpen.value = true
}

function closeForm(): void {
  formOpen.value = false
  editingId.value = null
  resetDraft()
}

async function handleSubmit(): Promise<void> {
  if (!draft.brand.trim() || !draft.series.trim()) return
  submitting.value = true
  try {
    const input = {
      brand: draft.brand.trim(),
      series: draft.series.trim(),
      modelYear: numberOrNull(draft.modelYear),
      trimName: draft.trimName.trim() || null,
      bodyType: draft.bodyType.trim() || null,
      powerType: draft.powerType,
      displacementCc: numberOrNull(draft.displacementCc),
      transmission: draft.transmission.trim() || null,
      hasChain: draft.hasChain,
      synonyms: parseSynonyms(draft.synonymsText),
      specs: {
        maxPowerHp: numberOrNull(draft.maxPowerHp),
        maxTorqueKgm: numberOrNull(draft.maxTorqueKgm),
        fuelTankCapacityL: numberOrNull(draft.fuelTankCapacityL),
        motorPowerW: numberOrNull(draft.motorPowerW),
        weightKg: numberOrNull(draft.weightKg),
        seatHeightMm: numberOrNull(draft.seatHeightMm),
        officialAverageKmPerL: numberOrNull(draft.officialAverageKmPerL),
        abs: draft.abs,
        tcs: draft.tcs,
        cbs: draft.cbs,
      },
    }
    const id = editingId.value ?? (await createVehicleModel(input))
    if (editingId.value) await updateVehicleModel(editingId.value, input)
    if (photoFile.value) {
      const { blob } = await imageCompressionService.compressImage(photoFile.value)
      const url = await storageService.uploadVehicleModelPhoto(id, blob)
      await setVehicleModelCoverImage(id, url)
    }
    closeForm()
    await reload()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id: string): Promise<void> {
  if (!window.confirm('刪除這筆車款資料？')) return
  await deleteVehicleModel(id)
  if (editingId.value === id) closeForm()
  await reload()
}

onMounted(async () => {
  await reload()
  loading.value = false
})
</script>

<template>
  <div>
    <p class="admin-page-intro">
      車輛選單資訊（<code>vehicleModels</code>）——「我的車輛」新增車輛時的廠牌／車系／排氣量／名稱四層選單，
      以及刊登表單的鏈條傳動判斷，都是直接讀取這份主檔（見
      <code>src/components/common/VehicleModelSelect.vue</code>）。在這裡新增、修改或刪除的車款，會立即反映在
      App 的選單裡。convenience/display/lighting/storage/security
      等配備旗標與 fuelReports/reviews 統計目前無填寫介面，欄位保留預設值。
    </p>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>標準車款規格</h2>
        <input
          v-model="searchText"
          type="search"
          class="admin-search"
          placeholder="搜尋廠牌、車系、名稱..."
        />
        <div class="spacer"></div>
        <button class="admin-btn sm primary" @click="formOpen ? closeForm() : openCreateForm()">
          {{ formOpen ? '取消' : '新增車款' }}
        </button>
      </div>

      <div
        v-if="formOpen"
        class="admin-panel-body"
        style="border-bottom: 1px solid var(--line-soft)"
      >
        <div class="admin-form-row">
          <label class="admin-field">
            <span>廠牌</span>
            <input v-model="draft.brand" type="text" list="brand-options" placeholder="HONDA" />
            <datalist id="brand-options">
              <option v-for="b in brandOptions" :key="b" :value="b" />
            </datalist>
          </label>
          <label class="admin-field">
            <span>車系</span>
            <input v-model="draft.series" type="text" list="series-options" placeholder="PCX 160" />
            <datalist id="series-options">
              <option v-for="s in seriesOptions" :key="s" :value="s" />
            </datalist>
          </label>
          <label class="admin-field">
            <span>年式</span>
            <select v-model="draft.modelYear">
              <option value="">未填</option>
              <option v-for="y in yearOptions" :key="y" :value="String(y)">{{ y }}</option>
            </select>
          </label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px">
          <label class="admin-field"
            ><span>版本／配置</span
            ><input v-model="draft.trimName" type="text" placeholder="ABS 版"
          /></label>
          <label class="admin-field">
            <span>車型類別</span>
            <input
              v-model="draft.bodyType"
              type="text"
              list="bodytype-options"
              placeholder="速可達 / 街車 / 打檔車"
            />
            <datalist id="bodytype-options">
              <option v-for="t in bodyTypeOptions" :key="t" :value="t" />
            </datalist>
          </label>
          <label class="admin-field">
            <span>動力形式</span>
            <select v-model="draft.powerType">
              <option value="gasoline">燃油</option>
              <option value="electric">電動</option>
            </select>
          </label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px">
          <label class="admin-field"
            ><span>排氣量 (cc)</span
            ><input v-model="draft.displacementCc" type="number" placeholder="155"
          /></label>
          <label class="admin-field">
            <span>傳動系統</span>
            <select v-model="draft.transmission">
              <option value="">未指定</option>
              <option v-for="t in TRANSMISSION_OPTIONS" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px">
          <label class="admin-check"><input v-model="draft.hasChain" type="checkbox" /> 鏈條傳動</label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px">
          <label class="admin-field admin-field-wide">
            <span>同義詞</span>
            <input
              v-model="draft.synonymsText"
              type="text"
              placeholder="以頓號分隔，例如：山葉100、老山葉、迅光100"
            />
          </label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px; align-items: flex-end">
          <label class="admin-field">
            <span>範例圖片上傳</span>
            <input type="file" accept="image/*" @change="handlePhotoChange" />
          </label>
          <div v-if="photoPreviewUrl || existingCoverImageUrl" class="admin-photo-preview">
            <img :src="photoPreviewUrl ?? existingCoverImageUrl!" alt="" />
          </div>
        </div>

        <p class="admin-form-subhead">規格（選填）</p>
        <div class="admin-form-row">
          <label class="admin-field"
            ><span>最大馬力 (ps)</span><input v-model="draft.maxPowerHp" type="number"
          /></label>
          <label class="admin-field"
            ><span>最大扭力 (kgm)</span><input v-model="draft.maxTorqueKgm" type="number"
          /></label>
          <label class="admin-field"
            ><span>油箱容量 (L)</span><input v-model="draft.fuelTankCapacityL" type="number"
          /></label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px">
          <label class="admin-field"
            ><span>馬達功率 (W，電動車)</span><input v-model="draft.motorPowerW" type="number"
          /></label>
          <label class="admin-field"
            ><span>車重 (kg)</span><input v-model="draft.weightKg" type="number"
          /></label>
          <label class="admin-field"
            ><span>座高 (mm)</span><input v-model="draft.seatHeightMm" type="number"
          /></label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px">
          <label class="admin-field"
            ><span>官方平均油耗 (km/L)</span
            ><input v-model="draft.officialAverageKmPerL" type="number"
          /></label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px; gap: 16px">
          <label class="admin-check"><input v-model="draft.abs" type="checkbox" /> ABS</label>
          <label class="admin-check"><input v-model="draft.tcs" type="checkbox" /> TCS</label>
          <label class="admin-check"><input v-model="draft.cbs" type="checkbox" /> CBS</label>
        </div>

        <button
          class="admin-btn primary"
          style="margin-top: 12px"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '儲存中...' : editingId ? '儲存修改' : '新增' }}
        </button>
      </div>

      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>車款</th>
              <th>類別</th>
              <th>動力</th>
              <th class="num">排氣量</th>
              <th class="num">馬力</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filteredModels.length === 0">
              <td class="admin-empty-cell" colspan="6">尚無資料</td>
            </tr>
            <tr v-for="m in filteredModels" :key="m.id">
              <td class="strong">
                {{ m.brand }} {{ m.series }}<span v-if="m.trimName"> {{ m.trimName }}</span>
                <span v-if="m.modelYear" class="dim"> ({{ m.modelYear }})</span>
              </td>
              <td class="dim">{{ m.bodyType || '—' }}</td>
              <td class="dim">{{ m.powerType === 'electric' ? '電動' : '燃油' }}</td>
              <td class="num dim">{{ m.displacementCc ?? '—' }}</td>
              <td class="num dim">{{ m.specs.engine.maxPowerHp ?? '—' }}</td>
              <td class="admin-row-actions">
                <button class="admin-btn sm" @click="openEditForm(m)">編輯</button>
                <button class="admin-btn sm danger" @click="handleDelete(m.id)">刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-form-subhead {
  margin: 14px 0 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--muted);
}

.admin-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.admin-search {
  width: 220px;
  padding: 6px 10px;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  font-size: 13px;
}

.admin-field-wide {
  flex: 1 1 100%;
}

.admin-photo-preview {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line-soft);
  flex-shrink: 0;
}

.admin-photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-row-actions {
  display: flex;
  gap: 8px;
}
</style>
