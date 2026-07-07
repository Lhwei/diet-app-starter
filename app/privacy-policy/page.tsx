export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 space-y-6 text-sm leading-relaxed text-gray-700">
      <h1 className="text-2xl font-bold text-gray-900">隱私權政策</h1>
      <p className="text-gray-400">最後更新日期：2026年7月5日</p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">1. 我們收集哪些資料</h2>
        <p>
          當您使用本服務時，我們會透過您的Google帳號取得基本身份資訊（如電子郵件、姓名），
          並在您授權後透過Notion API存取您指定的Notion頁面與資料庫，以讀取與寫入您的個人資料、
          生理紀錄、飲食紀錄等健康相關資訊。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">2. 資料如何被使用</h2>
        <p>
          您的健康紀錄僅用於在本App中呈現儀表板、圖表分析與體重目標預估功能，
          不會用於任何廣告投放、資料轉售或其他與本服務無關的目的。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">3. 資料儲存與保護</h2>
        <p>
          您的Notion授權憑證（access token、refresh token）經加密後儲存於Supabase資料庫，
          且僅能由伺服器端程式碼存取，不會以明文形式儲存或傳輸。您的健康紀錄實際內容
          仍保存於您自己的Notion workspace，本App僅在您使用期間暫時讀取以顯示畫面，
          不會長期複製或另行備份您的健康紀錄原始內容。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">4. 資料存取範圍</h2>
        <p>
          本App僅存取您在Notion授權流程中明確選擇、且由本App建立的頁面與資料庫
          （個人資料、AI用PROMPT、生理紀錄、飲食紀錄），不會掃描或存取您Notion workspace中
          其他未經本App建立或指定的內容。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">5. 第三方服務</h2>
        <p>
          本服務使用以下第三方服務：Google（登入驗證）、Supabase（資料庫與身份驗證）、
          Notion（資料儲存與同步）。這些服務各自有其獨立的隱私權政策，建議您參閱其官方文件。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">6. 您的權利</h2>
        <p>
          您可以隨時在帳號設定頁面中刪除您的帳號，此操作會清除您在本App資料庫中儲存的所有紀錄
          與加密授權憑證。請注意：您Notion workspace中原有的頁面與資料庫內容不受本App控制，
          刪除帳號不會刪除您Notion中已存在的實際資料，如需刪除請直接於Notion中操作。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">7. 聯絡我們</h2>
        <p>
          若您對本隱私權政策有任何疑問，或希望行使前述權利，請透過
          <a href="mailto:support@example.com" className="text-blue-600 underline">support@example.com</a>
          與我們聯繫。
        </p>
      </section>
    </main>
  )
}
