'use client'

// 完整生理紀錄列表（/physio 頁面用）
// 更新：改用分頁模式讀取(/api/physio?limit=50&cursor=xxx)，避免一次抓全部紀錄。
// 超過50筆時，畫面下方會出現「載入更多」按鈕，點擊後串接下一批(cursor-based分頁)。
// 不做日期篩選(隊長確認不需要)，純粹按「記錄日期」新到舊排序往下載入。

import { useState, useCallback } from 'react'
import PhysioRecordForm from './PhysioRecordForm'
import LoadingSpinner from './LoadingSpinner'
import { usePhysioRecordsPaginated } from '@/lib/hooks/useNotionData'

export default function PhysioRecordList() {
  const {
    records,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = usePhysioRecordsPaginated(50)

  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleCreateSuccess() {
    setShowForm(false)
    refresh()
  }

  function handleEditSuccess() {
    setEditingRecord(null)
    refresh()
  }

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('確定要刪除這筆紀錄嗎？（會移至 Notion 垃圾桶）')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/physio/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || '刪除失敗')
      }
      refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }, [refresh])

  if (isLoading && records.length === 0) return <LoadingSpinner />

  if (error === 'notion_not_ready') {
    return (
      <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
        Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
      </div>
    )
  }

  if (error) return <p className="text-red-600">讀取失敗：{error}</p>

  if (editingRecord) {
    return (
      <PhysioRecordForm
        recordId={editingRecord.id}
        initialValues={editingRecord}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditingRecord(null)}
      />
    )
  }

  if (showForm) {
    return <PhysioRecordForm onSuccess={handleCreateSuccess} onCancel={() => setShowForm(false)} />
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="bg-black text-white rounded-xl px-5 py-2.5 font-medium hover:opacity-90 transition"
      >
        + 新增生理紀錄
      </button>

      {records.length === 0 && (
        <p className="text-gray-400">還沒有任何紀錄，點上面按鈕新增第一筆吧！</p>
      )}

      <div className="space-y-3">
        {records.map((record: any) => (
          <div key={record.id} className="bg-white rounded-2xl shadow-sm p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="font-medium text-gray-400 text-sm">
                {record.recordDate}
                {record.timeSlot && <span className="ml-2 text-gray-700">{record.timeSlot}</span>}
              </p>
              <div className="flex gap-4 text-sm text-gray-700">
                {record.weight != null && <span>體重 {record.weight}kg</span>}
                {record.bodyFat != null && <span>體脂 {record.bodyFat}%</span>}
                {record.systolic != null && <span>血壓 {record.systolic}/{record.diastolic}</span>}
                {record.bloodSugar != null && <span>血糖 {record.bloodSugar}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditingRecord(record)}
                className="text-sm rounded-lg px-3 py-1.5 border border-gray-300 hover:bg-gray-50"
              >
                編輯
              </button>
              <button
                onClick={() => handleDelete(record.id)}
                disabled={deletingId === record.id}
                className="text-sm rounded-lg px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingId === record.id ? '刪除中...' : '刪除'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          className="w-full rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isLoadingMore ? '載入中...' : '載入更多'}
        </button>
      )}
    </div>
  )
}
