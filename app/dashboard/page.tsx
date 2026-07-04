import NavBar from '@/components/NavBar'

export default function DashboardPage() {
  return (
    <>
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">飲食儀表板</h1>
        <p className="text-gray-500 mb-6">
          這裡之後會顯示每日熱量、營養素比例等健康儀表板圖表（資料由伺服器端彙整後回傳）。
        </p>
        <div className="border-2 border-dashed rounded-2xl p-10 text-center text-gray-400">
          圖表開發中，敬請期待 📊
        </div>
      </main>
    </>
  )
}
