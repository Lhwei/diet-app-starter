'use client'

import { useEffect, useState, useCallback } from 'react'
import DietRecordForm from './DietRecordForm'
import LoadingSpinner from './LoadingSpinner'

export default function DietRecordList() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/diet')
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || '讀取失敗')
      }
      const data = await res.json()
      setRecords(data.records)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  function handleCreateSuccess() {
    setShowForm(false)
    fetchRecords()
  }

  function handleEditSuccess() {
    setEditingRecord(null)
    fetchRecords()
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這筆紀錄嗎？（會移至 Notion 垃圾桶）')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/diet/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || '刪除失敗')
      }
      setRecords((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error === 'notion_not_ready') {
    return (
      <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
        Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
      </div>
    )
  }

  if (error) {
    return <p className="text-red-600">讀取失敗：{error}</p>
  }

  if (editingRecord) {
    return (
      <DietRecordForm
        recordId={editingRecord.id}
        initialValues={editingRecord}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditingRecord(null)}
      />
    )
  }

  if (showForm) {
    return (
      <DietRecordForm
        onSuccess={handleCreateSuccess}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="bg-black text-white rounded-xl px-5 py-2.5 font-medium hover:opacity-90 transition"
      >
        + 新增飲食紀錄
      </button>

      {records.length === 0 && (
        <p className="text-gray-400">還沒有任何紀錄，點上面按鈕新增第一筆吧！</p>
      )}

      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="bg-white rounded-2xl shadow-sm p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="font-medium">
                {record.mealType && <span className="mr-2">{record.mealType}</span>}
                <span className="text-gray-400 text-sm">{record.recordTitle}</span>
              </p>
              {record.foodContent && <p className="text-gray-700 text-sm">{record.foodContent}</p>}
              {record.calories && (
                <p className="text-gray-400 text-sm">總熱量：{record.calories} kcal</p>
              )}
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
    </div>
  )
}
