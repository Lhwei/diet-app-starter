export default function TermsOfServicePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 pt-12 pb-20 space-y-6 text-sm leading-relaxed text-text-body">
      <h1 className="text-2xl font-bold text-text-strong">服務條款</h1>
      <p className="text-text-subtle">最後更新日期：2026年7月5日</p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-strong">1. 服務說明</h2>
        <p>
          本服務是一個健康自我追蹤輔助工具，協助您透過Notion記錄與檢視個人生理與飲食資訊，
          並提供儀表板圖表分析。本服務不提供醫療建議、診斷或治療，僅供個人紀錄與參考使用。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-strong">2. 非醫療用途聲明</h2>
        <p>
          本App所提供之BMR、TDEE、體重達成日期預估等數值，僅為概略估算，
          不能取代專業醫療、營養或健身建議。若您有特定健康狀況或疑慮，請諮詢專業醫療人員。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-strong">3. 使用者責任</h2>
        <p>
          您應對透過本服務輸入之資料的正確性負責。您同意不會利用本服務進行任何違法、
          侵害他人權益，或試圖繞過本服務安全機制之行為。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-strong">4. 帳號與終止</h2>
        <p>
          您可以隨時刪除自己的帳號。若您違反本服務條款，我們保留暫停或終止您帳號使用權的權利。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-strong">5. 免責聲明</h2>
        <p>
          本服務依「現況」提供，不對服務不中斷、無錯誤或特定用途之適用性作任何保證。
          在法律允許的最大範圍內，本服務不對因使用本服務而導致之任何直接或間接損害負責。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-strong">6. 條款修改</h2>
        <p>
          我們可能不時修改本服務條款，修改後將公告於本頁面。您於修改後繼續使用本服務，
          即視為同意修改後之條款。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-strong">7. 聯絡我們</h2>
        <p>
          若您對本服務條款有任何疑問，請透過
          <a href="https://www.threads.com/@wei1216iew" className="text-accent underline">Threads</a>
          聯繫。
        </p>
      </section>
    </main>
  )
}
