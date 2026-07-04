import NavBar from '@/components/NavBar'
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

  return (
    <>
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">設定</h1>

        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold mb-3">Notion 連結狀態</h2>
          {isConnected ? (
            <div className="space-y-1">
              <p className="text-green-600 font-medium">✅ 已連結 Notion 工作區：{connection?.workspace_name ?? '未知'}</p>
              <p className="text-sm text-gray-500">初始化狀態：{connection?.init_step}</p>
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

        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold mb-3">個人資訊</h2>
          <p className="text-gray-500">這裡之後會放個人資料表單，之後再開發。</p>
        </section>
      </main>
    </>
  )
}
