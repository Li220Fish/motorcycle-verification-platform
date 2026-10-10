<script setup lang="ts">
import { ref } from 'vue'
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

interface Faq {
  q: string
  a: string
}

const faqs: Faq[] = [
  {
    q: '為什麼新增車輛後不能馬上開始驗車？',
    a: '每台車第一次驗車前，都需要先通過「行照驗證」——拍攝行照、由系統比對引擎號碼。這是為了確保驗車報告對應的是這台真實存在、車主本人持有的車輛，通過後才能解鎖「開始新的驗證」。',
  },
  {
    q: '買家複驗跟賣家自己做的驗證有什麼不一樣？',
    a: '核心照片、基本12項、冷車引擎檢測的操作方式完全相同；差異在「主動揭露」這一步——買家看到的是賣家當初實際勾選揭露的項目，加上系統自動帶入的該車型常見通病，供買家逐項確認，而且這些項目都不是必填，可以直接跳過不影響完成驗證。',
  },
  {
    q: '預約看車後，同意／婉拒／取消要去哪裡操作？',
    a: '都在聊天室裡——預約送出後，聊天室上方會出現一張狀態卡片，賣家可以在上面直接同意或婉拒，買家則可以取消。約定時間一到，雙方也會在同一個地方各自回報是否成交。',
  },
  {
    q: '車輛過戶是自動發生的嗎？',
    a: '不會。買家完成複驗並在比對頁選擇「已完成購買」後，還需要賣家主動到「我的刊登」管理頁按下「確認過戶」，系統確認雙方身份與驗證紀錄相符後才會真正把車輛移轉到買家的車庫。',
  },
  {
    q: '關閉通知後，還會不會收到訊息？',
    a: '在「設定 › 通知」裡，每個通知類別可以分別開關，關閉某一類別後，RiDE78 不會再為那個類別建立任何通知（列表裡也不會出現）；「推播通知」則是另一個獨立的總開關，只控制手機是否跳出系統推播，跟列表本身是否記錄是分開的兩件事。',
  },
  {
    q: '車輛轉移邀請碼跟刊登賣車有什麼不同？',
    a: '刊登賣車是公開上架、透過預約看車和驗車走完整套流程；車輛轉移邀請碼則是車主自己產生一個限時效的 6 碼代碼，私下直接交給下一位車主輸入兌換，沒有刊登、預約、驗車的過程，適合送人或私下成交等不需要走公開市集的情境。',
  },
]

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
          <p class="version">版本 {{ APP_VERSION }}</p>
          <p class="tagline">用可信的車況資料，串起買家與賣家。</p>
        </div>

        <div class="section-list">
          <button v-for="key in rowKeys" :key="key" class="section-row" @click="open(key)">
            <span>{{ t('about', key) }}</span>
            <ChevronRight :size="18" color="var(--color-text-disabled)" />
          </button>
        </div>

        <p class="copyright">© {{ new Date().getFullYear() }} RiDE78. All rights reserved.</p>
      </div>
    </template>

    <template v-else>
      <AppHeader :title="t('about', activeKey)" back custom-back @back="close" />

      <div class="content">
        <div v-if="activeKey === 'terms'" class="doc">
          <p class="updated">最後更新：2026 年 10 月</p>

          <h3>一、服務說明</h3>
          <p>
            RiDE78（以下稱「本服務」）提供機車車況驗證、驗車報告產生、二手機車刊登與媒合、買賣雙方站內聊天與預約看車等功能。使用本服務前，請完整閱讀本條款；註冊或登入即表示您已閱讀、理解並同意接受本條款之拘束。
          </p>

          <h3>二、帳號與資格</h3>
          <ul>
            <li>使用者須年滿法定成年年齡，並提供真實、正確的註冊資訊。</li>
            <li>
              帳號僅供本人使用，不得轉讓、出借或與他人共用；因帳號遭不當使用所生之損害，由帳號使用者自行承擔。
            </li>
            <li>
              本服務得於發現違反本條款、提供虛偽資料，或有其他正當理由時，暫停或終止使用者之帳號。
            </li>
          </ul>

          <h3>三、驗車服務的性質與限制</h3>
          <p>
            驗車報告之內容（含核心照片、基本檢查項目、引擎檢測數值、主動揭露資訊等）係由賣家與買家依流程指引自行拍攝、填寫或確認所產生，本服務提供拍攝引導、資料記錄與比對功能，<strong>並不保證</strong>報告內容之絕對真實性或車輛實際狀況與報告完全一致。使用者於交易前仍應自行實地檢視車輛、審慎判斷，本服務不對任何交易結果負擔保責任。
          </p>
          <p>
            行照驗證僅確認上傳之行照照片可辨識出引擎號碼等基本資訊，<strong>不等同</strong>於公路主管機關之正式查驗，亦不構成本服務對車輛合法性、權利狀態之任何擔保。
          </p>

          <h3>四、刊登與交易</h3>
          <ul>
            <li>
              刊登車輛前，該車輛須已完成一份屬於「車輛驗證」類型且已完成之驗證紀錄；刊登內容須與驗證紀錄及車輛實際狀況相符，不得刊登虛假、重複或誤導性資訊。
            </li>
            <li>
              看車預約、同意／婉拒／取消，以及成交後之車輛過戶，均依本服務站內流程進行；本服務不介入買賣雙方之價格磋商與金錢交付，交易安全與金流風險由雙方自行協商與承擔。
            </li>
            <li>
              車輛過戶一經由賣家於系統內確認，即會將該車輛之車主身分移轉予買家，且無法片面撤回，請於確認前再次核對買家身分與交易內容。
            </li>
          </ul>

          <h3>五、使用者內容</h3>
          <p>
            使用者於聊天室、討論中心等功能所上傳之文字、照片、影片等內容（下稱「使用者內容」），其權利歸使用者所有；惟使用者授權本服務於提供、維運、改善本服務之必要範圍內，得儲存、顯示、處理該等內容。使用者應確保其上傳內容不侵害他人之智慧財產權、隱私權或其他合法權益，亦不得包含違法、騷擾、歧視或其他不當內容。
          </p>

          <h3>六、禁止行為</h3>
          <ul>
            <li>上傳虛偽行照、偽造車況資料，或以任何方式誤導其他使用者。</li>
            <li>規避、破壞本服務之驗證、通知、評分或其他機制之正常運作。</li>
            <li>以自動化工具大量擷取本服務資料，或從事任何可能損害系統穩定性之行為。</li>
            <li>利用本服務從事任何違反中華民國法令之行為。</li>
          </ul>

          <h3>七、免責聲明與責任限制</h3>
          <p>
            本服務依「現狀」提供，不擔保服務將不中斷、無錯誤，或完全符合使用者之特定需求。於法令允許之最大範圍內，本服務對因使用或無法使用本服務所生之任何直接、間接、附帶或衍生性損害，不負賠償責任；本服務之賠償責任總額，於任何情況下不超過使用者於事發前十二個月內為使用本服務所支付之費用（若有）。
          </p>

          <h3>八、條款修改與終止</h3>
          <p>
            本服務得於必要時修改本條款，並於修改後公告於本頁面；重大變更將另以站內通知方式告知。使用者於修改後繼續使用本服務，即視為同意修改後之條款。使用者得隨時停止使用本服務；本服務亦得於使用者違反本條款時，暫停或終止其帳號。
          </p>

          <h3>九、準據法與管轄</h3>
          <p>
            本條款之解釋與適用，以中華民國法律為準據法；如有爭議，雙方同意以本服務營運所在地之地方法院為第一審管轄法院。
          </p>
        </div>

        <div v-else-if="activeKey === 'privacy'" class="doc">
          <p class="updated">最後更新：2026 年 10 月</p>

          <h3>一、適用範圍</h3>
          <p>
            本隱私權政策說明 RiDE78
            如何蒐集、使用、儲存及保護您於使用本服務時所提供或產生之個人資料。本服務僅於您註冊帳號並同意本政策後，開始處理您的個人資料。
          </p>

          <h3>二、我們蒐集的資料</h3>
          <ul>
            <li><strong>帳號資料：</strong>電子郵件、顯示名稱、頭像照片。</li>
            <li>
              <strong>車輛與驗證資料：</strong
              >車輛基本資訊（品牌、型號、年份、里程等）、行照照片（經系統比對後，個人資訊部分會以遮蔽方式處理，僅保留車輛識別所需欄位）、驗車過程所拍攝之照片／影片／音訊、檢查結果與備註。
            </li>
            <li>
              <strong>交易與互動資料：</strong
              >刊登內容、看車預約紀錄、聊天訊息、討論中心之貼文與留言、收藏與追蹤關係。
            </li>
            <li>
              <strong>裝置與技術資料：</strong>推播通知所需之裝置識別碼（FCM token）、App
              版本、作業系統等基本技術資訊。
            </li>
          </ul>
          <p>
            本服務不會主動蒐集您的即時地理位置；車輛所在地區僅由使用者於刊登時自行填寫之文字描述。
          </p>

          <h3>三、資料使用目的</h3>
          <ul>
            <li>提供帳號註冊、登入與身分驗證。</li>
            <li>產生驗車報告、比對買賣雙方之驗車結果。</li>
            <li>提供二手機車刊登、搜尋、預約看車、站內聊天等媒合功能。</li>
            <li>發送與您帳號相關之系統通知與（經您同意之類別）推播通知。</li>
            <li>維運、除錯、改善本服務之功能與使用體驗。</li>
            <li>因應法令要求或主管機關之合法請求。</li>
          </ul>

          <h3>四、第三方服務提供者</h3>
          <p>
            本服務使用第三方雲端服務供應商（例如帳號驗證、資料庫與檔案儲存、推播通知等基礎設施服務）協助處理前述資料，該等供應商僅於提供服務之必要範圍內處理資料，並受其自身資料保護政策及本服務之要求所拘束。本服務不會將您的個人資料出售予第三方，亦不會用於與本服務無關之廣告目的。
          </p>

          <h3>五、資料儲存與安全</h3>
          <p>
            您的資料儲存於具存取控制機制之雲端資料庫，依資料性質分別設定讀取權限（例如：行照原始照片僅供系統驗證流程與您本人存取；已公開之驗車報告依您的設定決定可見範圍）。本服務採取合理之技術與管理措施保護資料安全，但無法保證絕對不會發生未經授權之存取，如發生重大資安事件，將依法令規定通知受影響之使用者。
          </p>

          <h3>六、資料保留</h3>
          <p>
            於您使用本服務期間，前述資料將持續保留以提供服務；帳號經終止後，本服務將於合理期間內刪除或去識別化處理不再需要之個人資料，惟法令要求保留（如交易紀錄）或仍有正當業務需要之部分，將依法令規定之期間保留。
          </p>

          <h3>七、您的權利</h3>
          <p>
            您得依法請求查詢、閱覽、複製、補充、更正您的個人資料，或請求停止蒐集、處理、利用，或請求刪除。部分與交易紀錄、安全稽核相關之資料，可能因法令或正當業務需要而無法立即刪除。如欲行使上述權利，請透過本頁「聯絡我們」所列方式與我們聯繫。
          </p>

          <h3>八、兒童隱私</h3>
          <p>
            本服務不欲蒐集未達法定成年年齡者之個人資料；如發現有未成年人以不實資料註冊，本服務得於知悉後終止該帳號並刪除相關資料。
          </p>

          <h3>九、政策修改</h3>
          <p>
            本政策將因應服務內容或法令變動而修改，修改後將公告於本頁面；若變動範圍重大，將另以站內通知方式告知。
          </p>
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
          <p class="contact-intro">
            使用上有任何問題、發現功能異常，或想申請行使個人資料權利，歡迎透過以下方式與我們聯繫，我們會儘快回覆。
          </p>
          <a class="contact-row" :href="`mailto:${SUPPORT_EMAIL}`">
            <Mail :size="18" color="var(--color-primary)" />
            <span>{{ SUPPORT_EMAIL }}</span>
          </a>
          <p class="contact-note">
            服務時間：週一至週五 09:00–18:00（國定假日除外），我們通常會在 2 個工作日內回覆。
          </p>
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
