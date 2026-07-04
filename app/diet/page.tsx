import NavBar from '@/components/NavBar'

export default function DietPage() {
  return (
    <>
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">飲食紀錄</h1>
        <p className="text-gray-500 mb-6">
          這裡之後會放新增／查看／修改／刪除飲食紀錄的介面（會同步寫入 Notion「飲食紀錄」資料庫）。
        </p>
        <div className="border-2 border-dashed rounded-2xl p-10 text-center text-gray-400">
          CRUD UI 開發中，敬請期待 🚧
        </div>
      </main>
    </>
  )
}
