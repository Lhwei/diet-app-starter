import TodayPhysioSummary from '@/components/TodayPhysioSummary'
import ProfileMetricsSummary from '@/components/ProfileMetricsSummary'
import LogoutButton from '@/components/LogoutButton'
import DeleteAccountSection from '@/components/DeleteAccountSection'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    <>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">設定</h1>

        {/* 1. Notion 連結狀態：邏輯與文案完全沿用原本的設定頁，未做任何修改 */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold mb-3">Notion 連結狀態</h2>
          {isConnected ? (
            <div className="space-y-3">
              <p className="text-green-600 font-medium">✅ 已連結 Notion 工作區：{connection?.workspace_name ?? '未知'}</p>
              <p className="text-sm text-gray-500">初始化狀態：{connection?.init_step}</p>

              {!isInitCompleted && (
                <form action="/api/notion/init" method="POST">
                  <button
                    type="submit"
                    className="inline-block bg-black text-white rounded-xl px-5 py-2.5 font-medium hover:opacity-90 transition"
                  >
                    建立 Notion 資料結構
                  </button>
                  <p className="text-sm text-gray-400 mt-2">
                    會在你選取的頁面下自動建立「個人資料」「AI用PROMPT」「生理紀錄」「飲食紀錄」4 個物件
                  </p>
                </form>
              )}

              {isInitCompleted && (
                <p className="text-sm text-gray-500">🎉 Notion 資料結構已建立完成，可以開始使用飲食紀錄功能了</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-500">尚未連結 Notion，請授權後我們會自動建立「個人資料」「AI用PROMPT」頁面與「生理紀錄」「飲食紀錄」資料庫。</p>
              <a
                href="/api/notion/oauth/start"
                className="inline-block bg-black text-white rounded-xl px-5 py-2.5 font-medium hover:opacity-90 transition"
              >
                連結 Notion
              </a>
            </div>
          )}
        </section>

        {/* 2. 生理紀錄：只顯示「今天」的摘要，完整歷史紀錄請到 /physio 頁面查看 */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold mb-3">生理紀錄</h2>
          <TodayPhysioSummary />
        </section>

        {/* 3. 個人資料：只顯示 BMR / TDEE / BMI / 每日飲水目標 四個關鍵指標，完整表單請到 /profile 頁面查看 */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold mb-3">個人資料</h2>
          <ProfileMetricsSummary />
        </section>

        {/* 4. 隱私權政策 / 服務條款連結：放在登出帳號上方 */}
        <section className="bg-white rounded-2xl shadow-sm p-6 flex flex-wrap gap-4">
          <Link href="/privacy-policy" className="text-sm text-gray-600 hover:underline">
            隱私權政策
          </Link>
          <Link href="/terms-of-service" className="text-sm text-gray-600 hover:underline">
            服務條款
          </Link>
        </section>

        {/* 5. 登出帳號 */}
        <section className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">登出帳號</h2>
            <p className="text-sm text-gray-500 mt-1">登出後需要重新使用 Google 帳號登入</p>
          </div>
          <LogoutButton />
        </section>

        {/* 6. 刪除帳號：規格書要求的帳號/資料刪除功能，含二次確認與明確文案說明 */}
        <DeleteAccountSection />
      </main>
    </>
  )
}
