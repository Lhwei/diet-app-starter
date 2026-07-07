import TodayPhysioSummary from '@/components/TodayPhysioSummary'
import ProfileMetricsSummary from '@/components/ProfileMetricsSummary'
import LogoutButton from '@/components/LogoutButton'
import DeleteAccountSection from '@/components/DeleteAccountSection'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// 設定頁 —— 資訊層級重新設計，手機優先
//
// 設計重點：
// 1. 原本6個section用同一種白卡片、同一種視覺權重平鋪，使用者很難一眼分出「哪個重要、哪個只是連結」。
//    重新分成三層：
//    - 狀態層（Notion連結狀態）：這是整個App能不能用的前提，異常時要最先被看到，放最上面且用醒目色塊
//    - 資料層（生理紀錄、個人資料摘要）：手機上常態查看的內容，維持卡片但精簡padding、資訊更緊湊
//    - 帳號與法遵層（隱私權/服務條款、登出、刪除帳號）：低頻操作，改成手機常見的「列表式選單」樣式，
//      不再是一堆各自獨立的大卡片，縮小視覺佔比，且「刪除帳號」用紅色文字獨立於清單最下方，符合手機App慣例
// 2. 隱私權政策/服務條款/登出，合併成同一個列表卡片內的橫向分隔列（類似iOS設定頁常見的list row），
//    大幅減少手機上的滑動距離
// 3. 每個資料層小節加一句副標說明用途，降低理解成本

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: connection } = await supabase
    .from('notion_connections')
    .select('status, init_step, workspace_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const isConnected = connection?.status === 'connected'
  const isInitCompleted = connection?.init_step === 'completed'

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-8 pb-16">
      <h1 className="text-xl sm:text-2xl font-bold">設定</h1>

      {/* 狀態層：Notion 連結狀態，App能不能正常運作的前提，用色塊區分正常/異常一目瞭然 */}
      <section>
        {isConnected ? (
          <div className="rounded-2xl p-4 space-y-2.5 bg-green-50 border border-green-100">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-lg">✅</span>
              <p className="text-sm font-medium text-green-700">
                已連結 Notion 工作區：{connection?.workspace_name ?? '未知'}
              </p>
            </div>

            {!isInitCompleted ? (
              <div className="pt-1 space-y-2">
                <p className="text-xs text-green-600">初始化狀態：{connection?.init_step}</p>
                <form action="/api/notion/init" method="POST">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-black text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
                  >
                    建立 Notion 資料結構
                  </button>
                </form>
                <p className="text-xs text-green-600/80">
                  會自動建立「個人資料」「AI用PROMPT」「生理紀錄」「飲食紀錄」4 個物件
                </p>
              </div>
            ) : (
              <p className="text-xs text-green-600">🎉 資料結構已建立完成，可以開始使用飲食紀錄功能了</p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-4 space-y-3 bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-lg">⚠️</span>
              <p className="text-sm font-medium text-amber-700">尚未連結 Notion</p>
            </div>
            <p className="text-xs text-amber-600/90">
              授權後會自動建立「個人資料」「AI用PROMPT」頁面與「生理紀錄」「飲食紀錄」資料庫
            </p>
            <a
              href="/api/notion/oauth/start"
              className="inline-block w-full sm:w-auto text-center bg-black text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              連結 Notion
            </a>
          </div>
        )}
      </section>

      {/* 資料層：今日生理紀錄摘要、個人資料關鍵指標，手機上常態查看的內容 */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">健康資料</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <div className="p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">生理紀錄</h3>
              <p className="text-xs text-gray-400 mt-0.5">今天的量測摘要，完整歷史請至生理紀錄頁查看</p>
            </div>
            <TodayPhysioSummary />
          </div>
          <div className="p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">個人資料</h3>
              <p className="text-xs text-gray-400 mt-0.5">BMR / TDEE / BMI / 每日飲水目標</p>
            </div>
            <ProfileMetricsSummary />
          </div>
        </div>
      </section>

      {/* 帳號與法遵層：低頻操作，用手機常見的list row樣式合併呈現，減少滑動距離 */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">帳號</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          <Link
            href="/privacy-policy"
            className="flex items-center justify-between px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            隱私權政策
            <span className="text-gray-300">›</span>
          </Link>
          <Link
            href="/terms-of-service"
            className="flex items-center justify-between px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            服務條款
            <span className="text-gray-300">›</span>
          </Link>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm text-gray-700">登出帳號</p>
              <p className="text-xs text-gray-400 mt-0.5">登出後需重新使用 Google 帳號登入</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </section>

      {/* 危險操作層：刪除帳號單獨隔離在最下方，避免跟一般設定選項混在一起誤觸 */}
      <section>
        <DeleteAccountSection />
      </section>
    </main>
  )
}
