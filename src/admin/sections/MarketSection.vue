<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { listAllListings } from '../services/admin-data.service'
import type { MockMarketListing } from '@/data/home/marketplace-mock'

const loading = ref(true)
const listings = ref<MockMarketListing[]>([])
const filter = ref<'all' | 'own'>('all')

function completeness(listing: MockMarketListing): number {
  const checks = [
    !!listing.description,
    listing.vehicleSnapshot.photos.length > 0,
    listing.priceTwd > 0,
    !!listing.region,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

const avgPrice = computed(() => {
  if (listings.value.length === 0) return null
  return Math.round(listings.value.reduce((s, l) => s + l.priceTwd, 0) / listings.value.length)
})

const filtered = computed(() => {
  if (filter.value === 'all') return listings.value
  return listings.value.filter((l) => l.vehicleId)
})

onMounted(async () => {
  listings.value = await listAllListings()
  loading.value = false
})
</script>

<template>
  <div>
    <p class="admin-page-intro">
      對應 app「交易市場」。marketplaceListings 目前只有 draft/published 兩種狀態
      （售出/下架屬於交易流程，本次未實作），「待審」「媒合成功」等更細的狀態仍無法呈現。
    </p>

    <dl class="admin-strip">
      <div>
        <dt>刊登總數</dt>
        <dd>{{ loading ? '—' : listings.length }}</dd>
        <div class="note">含 DEMO 展示資料</div>
      </div>
      <div>
        <dt>已上架</dt>
        <dd>{{ loading ? '—' : listings.filter((l) => l.status === 'published').length }}</dd>
        <div class="note">status: published</div>
      </div>
      <div>
        <dt>使用者自建</dt>
        <dd>{{ loading ? '—' : listings.filter((l) => l.vehicleId).length }}</dd>
        <div class="note">有關聯車輛者</div>
      </div>
      <div>
        <dt>平均價格</dt>
        <dd>{{ loading || avgPrice === null ? '—' : avgPrice.toLocaleString() }}</dd>
        <div class="note">新台幣</div>
      </div>
    </dl>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>刊登列表</h2>
        <div class="spacer"></div>
        <div class="admin-filters">
          <button class="admin-chip" :class="{ active: filter === 'all' }" @click="filter = 'all'">
            全部
          </button>
          <button class="admin-chip" :class="{ active: filter === 'own' }" @click="filter = 'own'">
            使用者自建
          </button>
        </div>
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>車輛</th>
              <th>賣家</th>
              <th>狀態</th>
              <th>刊登完整度</th>
              <th class="num">價格</th>
              <th class="num">收藏</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0">
              <td class="admin-empty-cell" colspan="6">尚無資料</td>
            </tr>
            <tr v-for="l in filtered" :key="l.id">
              <td class="strong">{{ l.vehicleSnapshot.brand }} {{ l.vehicleSnapshot.model }}</td>
              <td class="dim">{{ l.sellerName }}</td>
              <td>
                <span class="admin-pill" :class="l.status === 'published' ? 'ok' : 'mute'">
                  {{ l.status === 'published' ? '已上架' : '草稿' }}
                </span>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px">
                  <div class="admin-bar" style="width: 70px">
                    <i :style="{ width: `${completeness(l)}%` }" />
                  </div>
                  <span class="dim">{{ completeness(l) }}%</span>
                </div>
              </td>
              <td class="num">{{ l.priceTwd.toLocaleString() }}</td>
              <td class="num">{{ l.favoriteCount ?? 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
