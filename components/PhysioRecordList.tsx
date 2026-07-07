'use client'

// 完整生理紀錄列表（/physio 頁面用）
// 分頁模式讀取(/api/physio?limit=50&cursor=xxx)，超過50筆時「載入更多」串接下一批(cursor-based分頁)。
// 不做日期篩選(隊長確認不需要)，純粹按「記錄日期」新到舊排序往下載入。
//
// 本次修正：
// 1. 排序已改由後端保證新到舊（記錄日期可能混雜新舊格式，後端統一重新排序後才回傳）
// 2. 分頁查詢改成不經過伺服器端快取，F5重新整理一律拿到Notion最新資料
// 3. 卡片改用跟飲食紀錄一致的 SwipeableRecordCard（點按進入編輯、左滑刪除）
// 4. 卡片資訊層級重新設計：時段(標籤)+日期時間 → 體重(主要大數字) → 其他數值(次要chip)

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PhysioRecordForm from './PhysioRecordForm'
import LoadingSpinner from './LoadingSpinner'
import SwipeableRecordCard from './SwipeableRecordCard'
import { usePhysioRecordsPaginated } from '@/lib/hooks/useNotionData'

function formatRecordDateDisplay(recordDate: string): string {
  const date = new Date(recordDate)
  if (isNaN(date.getTime())) return recordDate
  return date.toLocaleString('zh-TW', { hour12: false })
}

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

  const searchParams = useSearchParams()
  const router = useRouter()
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      router.replace('/physio')
    }
  }, [searchParams])

  function handleCreateSuccess() {
    setShowForm(false)
    refresh()
  }

  function handleEditSuccess() {
    setEditingRecord(null)
    refresh()
  }

  async function handleDelete(id: string) {
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
  }

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
        key={`edit-${editingRecord.id}`}
        recordId={editingRecord.id}
        initialValues={editingRecord}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditingRecord(null)}
      />
    )
  }

  if (showForm) {
    return <PhysioRecordForm key="new" onSuccess={handleCreateSuccess} onCancel={() => setShowForm(false)} />
  }

  return (
    <div className="space-y-4">

      {records.length === 0 && (
        <p className="text-gray-400">還沒有任何紀錄，點上面按鈕新增第一筆吧！</p>
      )}

      <div className="space-y-3">
        {records.map((record: any) => (
          <SwipeableRecordCard
            key={record.id}
            onEdit={() => setEditingRecord(record)}
            onDelete={() => handleDelete(record.id)}
            isDeleting={deletingId === record.id}
          >
            <div className="p-4 space-y-2.5">
              {/* 第一層：時段(主標籤) + 日期時間(次要資訊)，一眼看出「這是什麼時段量的、何時量的」 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {record.timeSlot && (
                    <span className="inline-flex items-center rounded-full bg-gray-900 text-white text-xs font-medium px-2.5 py-1">
                      {record.timeSlot}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{formatRecordDateDisplay(record.recordDate)}</span>
                </div>
                {record.weight != null && (
                  <span className="text-base font-bold text-gray-900">
                    {record.weight}<span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
                  </span>
                )}
              </div>

              {/* 第二層：其他常見數值，次要輔助資訊，用小型chip呈現 */}
              {(record.bodyFat != null || record.systolic != null || record.bloodSugar != null) && (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {record.bodyFat != null && (
                    <span className="text-xs rounded-md px-2 py-1 font-medium bg-gray-50 text-gray-600">
                      體脂 {record.bodyFat}%
                    </span>
                  )}
                  {record.systolic != null && (
                    <span className="text-xs rounded-md px-2 py-1 font-medium bg-gray-50 text-gray-600">
                      血壓 {record.systolic}/{record.diastolic ?? '-'}
                    </span>
                  )}
                  {record.bloodSugar != null && (
                    <span className="text-xs rounded-md px-2 py-1 font-medium bg-gray-50 text-gray-600">
                      血糖 {record.bloodSugar}
                    </span>
                  )}
                </div>
              )}
            </div>
          </SwipeableRecordCard>
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
