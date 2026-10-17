<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Mail } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import Logo from '@/components/common/Logo.vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const APP_VERSION = '1.0.0-beta'
const SUPPORT_EMAIL = 'support@ride78.app'

type AboutKey = 'terms' | 'privacy' | 'faq' | 'contact'
const rowKeys: AboutKey[] = ['terms', 'privacy', 'faq', 'contact']

const activeKey = ref<AboutKey | null>(null)

function open(key: AboutKey): void {
  activeKey.value = key
}

function close(): void {
  activeKey.value = null
}

const faqs = computed(() => [
  { q: t('about', 'faqQ1'), a: t('about', 'faqA1') },
  { q: t('about', 'faqQ2'), a: t('about', 'faqA2') },
  { q: t('about', 'faqQ3'), a: t('about', 'faqA3') },
  { q: t('about', 'faqQ4'), a: t('about', 'faqA4') },
  { q: t('about', 'faqQ5'), a: t('about', 'faqA5') },
  { q: t('about', 'faqQ6'), a: t('about', 'faqA6') },
])

const faqOpen = ref<number | null>(null)
function toggleFaq(index: number): void {
  faqOpen.value = faqOpen.value === index ? null : index
}
</script>

<template>
  <div>
    <template v-if="!activeKey">
      <AppHeader :title="t('settings', 'about')" back />

      <div class="content">
        <div class="brand-card">
          <Logo size="lg" />
          <p class="version">{{ t('about', 'versionPrefix') }} {{ APP_VERSION }}</p>
          <p class="tagline">{{ t('about', 'tagline') }}</p>
        </div>

        <div class="section-list">
          <button v-for="key in rowKeys" :key="key" class="section-row" @click="open(key)">
            <span>{{ t('about', key) }}</span>
            <ChevronRight :size="18" color="var(--color-text-disabled)" />
          </button>
        </div>

        <p class="copyright">© {{ new Date().getFullYear() }} RiDE. All rights reserved.</p>
      </div>
    </template>

    <template v-else>
      <AppHeader :title="t('about', activeKey)" back custom-back @back="close" />

      <div class="content">
        <div v-if="activeKey === 'terms'" class="doc">
          <p class="updated">{{ t('about', 'lastUpdated') }}</p>

          <h3>{{ t('about', 'termsS1Title') }}</h3>
          <p>{{ t('about', 'termsS1Body') }}</p>

          <h3>{{ t('about', 'termsS2Title') }}</h3>
          <ul>
            <li>{{ t('about', 'termsS2Item1') }}</li>
            <li>{{ t('about', 'termsS2Item2') }}</li>
            <li>{{ t('about', 'termsS2Item3') }}</li>
          </ul>

          <h3>{{ t('about', 'termsS3Title') }}</h3>
          <p v-html="t('about', 'termsS3Body1')" />
          <p v-html="t('about', 'termsS3Body2')" />

          <h3>{{ t('about', 'termsS4Title') }}</h3>
          <ul>
            <li>{{ t('about', 'termsS4Item1') }}</li>
            <li>{{ t('about', 'termsS4Item2') }}</li>
            <li>{{ t('about', 'termsS4Item3') }}</li>
          </ul>

          <h3>{{ t('about', 'termsS5Title') }}</h3>
          <p>{{ t('about', 'termsS5Body') }}</p>

          <h3>{{ t('about', 'termsS6Title') }}</h3>
          <ul>
            <li>{{ t('about', 'termsS6Item1') }}</li>
            <li>{{ t('about', 'termsS6Item2') }}</li>
            <li>{{ t('about', 'termsS6Item3') }}</li>
            <li>{{ t('about', 'termsS6Item4') }}</li>
          </ul>

          <h3>{{ t('about', 'termsS7Title') }}</h3>
          <p>{{ t('about', 'termsS7Body') }}</p>

          <h3>{{ t('about', 'termsS8Title') }}</h3>
          <p>{{ t('about', 'termsS8Body') }}</p>

          <h3>{{ t('about', 'termsS9Title') }}</h3>
          <p>{{ t('about', 'termsS9Body') }}</p>
        </div>

        <div v-else-if="activeKey === 'privacy'" class="doc">
          <p class="updated">{{ t('about', 'lastUpdated') }}</p>

          <h3>{{ t('about', 'privacyS1Title') }}</h3>
          <p>{{ t('about', 'privacyS1Body') }}</p>

          <h3>{{ t('about', 'privacyS2Title') }}</h3>
          <ul>
            <li v-html="t('about', 'privacyS2Item1')" />
            <li v-html="t('about', 'privacyS2Item2')" />
            <li v-html="t('about', 'privacyS2Item3')" />
            <li v-html="t('about', 'privacyS2Item4')" />
          </ul>
          <p>{{ t('about', 'privacyS2Note') }}</p>

          <h3>{{ t('about', 'privacyS3Title') }}</h3>
          <ul>
            <li>{{ t('about', 'privacyS3Item1') }}</li>
            <li>{{ t('about', 'privacyS3Item2') }}</li>
            <li>{{ t('about', 'privacyS3Item3') }}</li>
            <li>{{ t('about', 'privacyS3Item4') }}</li>
            <li>{{ t('about', 'privacyS3Item5') }}</li>
            <li>{{ t('about', 'privacyS3Item6') }}</li>
          </ul>

          <h3>{{ t('about', 'privacyS4Title') }}</h3>
          <p>{{ t('about', 'privacyS4Body') }}</p>

          <h3>{{ t('about', 'privacyS5Title') }}</h3>
          <p>{{ t('about', 'privacyS5Body') }}</p>

          <h3>{{ t('about', 'privacyS6Title') }}</h3>
          <p>{{ t('about', 'privacyS6Body') }}</p>

          <h3>{{ t('about', 'privacyS7Title') }}</h3>
          <p>{{ t('about', 'privacyS7Body') }}</p>

          <h3>{{ t('about', 'privacyS8Title') }}</h3>
          <p>{{ t('about', 'privacyS8Body') }}</p>

          <h3>{{ t('about', 'privacyS9Title') }}</h3>
          <p>{{ t('about', 'privacyS9Body') }}</p>
        </div>

        <div v-else-if="activeKey === 'faq'" class="doc faq-doc">
          <details
            v-for="(item, index) in faqs"
            :key="item.q"
            class="faq-item"
            :open="faqOpen === index"
          >
            <summary @click.prevent="toggleFaq(index)">{{ item.q }}</summary>
            <p>{{ item.a }}</p>
          </details>
        </div>

        <div v-else-if="activeKey === 'contact'" class="doc contact-doc">
          <p class="contact-intro">{{ t('about', 'contactIntro') }}</p>
          <a class="contact-row" :href="`mailto:${SUPPORT_EMAIL}`">
            <Mail :size="18" color="var(--color-primary)" />
            <span>{{ SUPPORT_EMAIL }}</span>
          </a>
          <p class="contact-note">{{ t('about', 'contactNote') }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.brand-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-xl) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: center;
}

.version {
  margin: 6px 0 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.tagline {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.section-list {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
}

.section-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.copyright {
  text-align: center;
  font-size: 11.5px;
  color: var(--color-text-disabled);
  margin: 0;
}

.doc {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg) var(--space-md);
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.doc .updated {
  margin: 0 0 4px;
  font-size: 11.5px;
  color: var(--color-text-disabled);
}

.doc h3 {
  margin: 10px 0 2px;
  font-size: 14px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.doc p {
  margin: 0;
}

.doc ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.faq-doc {
  gap: var(--space-sm);
  padding: var(--space-sm);
}

.faq-item {
  padding: var(--space-md);
  border-radius: var(--radius-md);
}

.faq-item:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.faq-item summary {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  cursor: pointer;
  list-style: none;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item p {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.contact-doc {
  align-items: center;
  text-align: center;
  padding: var(--space-xl) var(--space-md);
}

.contact-intro {
  font-size: 13px;
  line-height: 1.7;
}

.contact-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}

.contact-note {
  font-size: 12px;
  color: var(--color-text-disabled);
}
</style>
