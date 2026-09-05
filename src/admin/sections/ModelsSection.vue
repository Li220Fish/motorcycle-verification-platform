<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import {
  createVehicleModel,
  deleteVehicleModel,
  listVehicleModels,
  type AdminVehicleModel,
} from '../services/admin-data.service'

const loading = ref(true)
const models = ref<AdminVehicleModel[]>([])
const formOpen = ref(false)
const submitting = ref(false)

const draft = reactive({
  brand: '',
  series: '',
  modelYear: '',
  trimName: '',
  bodyType: '',
  powerType: 'gasoline' as 'gasoline' | 'electric',
  displacementCc: '',
  transmission: '',
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

function resetDraft(): void {
  draft.brand = ''
  draft.series = ''
  draft.modelYear = ''
  draft.trimName = ''
  draft.bodyType = ''
  draft.powerType = 'gasoline'
  draft.displacementCc = ''
  draft.transmission = ''
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
}

function numberOrNull(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

async function reload(): Promise<void> {
  models.value = await listVehicleModels()
}

async function handleCreate(): Promise<void> {
  if (!draft.brand.trim() || !draft.series.trim()) return
  submitting.value = true
  try {
    await createVehicleModel({
      brand: draft.brand.trim(),
      series: draft.series.trim(),
      modelYear: numberOrNull(draft.modelYear),
      trimName: draft.trimName.trim() || null,
      bodyType: draft.bodyType.trim() || null,
      powerType: draft.powerType,
      displacementCc: numberOrNull(draft.displacementCc),
      transmission: draft.transmission.trim() || null,
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
    })
    resetDraft()
    formOpen.value = false
    await reload()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id: string): Promise<void> {
  await deleteVehicleModel(id)
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
      車款主檔（<code>vehicleModels</code>）。app
      端目前沒有任何地方讀取或寫入它——車輛的品牌／車型是使用者在建立車輛/刊登時自行輸入的自由文字，
      沒有經過這份主檔比對或校正。這裡先提供規格資料的新增/檢視/刪除；要讓它真正「發揮作用」（例如統一寫法、擋掉亂填的車型字串），還需要
      app
      端改成從這份主檔選擇，而不是自由輸入，詳見後台彙報。convenience/display/lighting/storage/security
      等配備旗標與 fuelReports/reviews 統計目前無填寫介面，欄位保留預設值。
    </p>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>標準車款規格</h2>
        <div class="spacer"></div>
        <button class="admin-btn sm primary" @click="formOpen = !formOpen">
          {{ formOpen ? '取消' : '新增車款' }}
        </button>
      </div>

      <div
        v-if="formOpen"
        class="admin-panel-body"
        style="border-bottom: 1px solid var(--line-soft)"
      >
        <div class="admin-form-row">
          <label class="admin-field"
            ><span>廠牌</span><input v-model="draft.brand" type="text" placeholder="HONDA"
          /></label>
          <label class="admin-field"
            ><span>車系</span><input v-model="draft.series" type="text" placeholder="PCX 160"
          /></label>
          <label class="admin-field"
            ><span>年式</span><input v-model="draft.modelYear" type="number" placeholder="2024"
          /></label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px">
          <label class="admin-field"
            ><span>版本／配置</span
            ><input v-model="draft.trimName" type="text" placeholder="ABS 版"
          /></label>
          <label class="admin-field"
            ><span>車型類別</span
            ><input v-model="draft.bodyType" type="text" placeholder="速可達 / 街車 / 檔車"
          /></label>
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
          <label class="admin-field"
            ><span>變速系統</span
            ><input v-model="draft.transmission" type="text" placeholder="CVT 無段變速"
          /></label>
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
          @click="handleCreate"
        >
          {{ submitting ? '新增中...' : '新增' }}
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
            <tr v-if="!loading && models.length === 0">
              <td class="admin-empty-cell" colspan="6">尚無資料</td>
            </tr>
            <tr v-for="m in models" :key="m.id">
              <td class="strong">
                {{ m.brand }} {{ m.series }}<span v-if="m.trimName"> {{ m.trimName }}</span>
                <span v-if="m.modelYear" class="dim"> ({{ m.modelYear }})</span>
              </td>
              <td class="dim">{{ m.bodyType || '—' }}</td>
              <td class="dim">{{ m.powerType === 'electric' ? '電動' : '燃油' }}</td>
              <td class="num dim">{{ m.displacementCc ?? '—' }}</td>
              <td class="num dim">{{ m.specs.engine.maxPowerHp ?? '—' }}</td>
              <td><button class="admin-btn sm danger" @click="handleDelete(m.id)">刪除</button></td>
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
</style>
