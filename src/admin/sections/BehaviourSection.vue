<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { listAllListings } from '../services/admin-data.service'

const loading = ref(true)
const under50k = ref(0)
const over50k = ref(0)
const total = ref(0)

function widthOf(part: number): string {
  if (total.value <= 0) return '0%'
  return `${Math.round((part / total.value) * 100)}%`
}

onMounted(async () => {
  const listings = await listAllListings()
  total.value = listings.length
  under50k.value = listings.filter((l) => l.priceTwd < 50000).length
  over50k.value = listings.filter((l) => l.priceTwd >= 50000).length
  loading.value = false
})
</script>

<template>
  <div>
    <div class="admin-split">
      <div class="admin-panel">
        <div class="admin-panel-head">
          <h2>感興趣的車款走行</h2>
          <span class="sub">app 目前無事件追蹤</span>
        </div>
        <div class="admin-panel-body flush admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>車款</th>
                <th class="num">瀏覽</th>
                <th class="num">收藏</th>
                <th class="num">聯繫</th>
                <th>轉換</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="admin-empty-cell" colspan="5">尚無資料</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-panel">
        <div class="admin-panel-head"><h2>興趣與定位是否一致</h2></div>
        <div class="admin-panel-body">
          <div class="admin-heat">
            <div class="admin-heatrow">
              <span class="lbl">5萬以下</span>
              <div class="admin-bar"><i :style="{ width: widthOf(under50k) }" /></div>
              <span class="val">{{ loading ? '—' : under50k }}</span>
            </div>
            <div class="admin-heatrow">
              <span class="lbl">5萬以上</span>
              <div class="admin-bar"><i :style="{ width: widthOf(over50k) }" /></div>
              <span class="val">{{ loading ? '—' : over50k }}</span>
            </div>
          </div>
          <div class="admin-note" style="margin-top: 14px">
            這裡以現有刊登的價格分布作為「供給端」的參考——真正的「需求端興趣」需要記錄使用者的瀏覽/收藏事件，
            目前平台沒有這類事件記錄，無法計算兩者是否一致。
          </div>
        </div>
      </div>
    </div>

    <div class="admin-panel">
      <div class="admin-panel-head"><h2>留存與流失</h2></div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>族群</th>
              <th class="num">人數</th>
              <th class="num">次日留存</th>
              <th class="num">7 天留存</th>
              <th class="num">30 天留存</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="admin-empty-cell" colspan="5">尚無資料</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="admin-note">
      留存率需要「使用者第一次登入日」與「後續每次登入日」的完整序列才能計算。 目前
      users/&#123;uid&#125;.lastSeenAt 只保留「最後一次」時間，沒有登入歷史紀錄， 無法回推次日/7
      天/30 天留存——若要支援，需要新增一個記錄每次登入時間戳記的子集合或 事件表，詳見後台彙報。
    </div>
  </div>
</template>
