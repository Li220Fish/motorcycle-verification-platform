<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

// One site, two entry points: the check page (LIFF / users) at "/" and the
// staff console at "/console" — loaded separately so users never download it.
const CheckPage = defineAsyncComponent(() => import('./check/CheckPage.vue'))
const ConsoleApp = defineAsyncComponent(() => import('./console/ConsoleApp.vue'))

const isConsole = window.location.pathname.startsWith('/console')
document.title = isConsole ? '引擎檢測・客服後台' : '引擎異音檢測'
</script>

<template>
  <ConsoleApp v-if="isConsole" />
  <CheckPage v-else />
</template>
