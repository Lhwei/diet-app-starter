'use client'

// 完整生理紀錄列表（/physio 頁面用）
// 分頁模式讀取(/api/physio?limit=50&cursor=xxx)，超過50筆時「載入更多」串接下一批(cursor-based分頁)。
// 不做日期篩選(隊長確認不需要)，純粹按「記錄日期」新到舊排序往下載入。
//
// 本次修正：統一「主要數值」插槽的樣式邏輯。
// 體重/飲水量/如廁類型三者互斥(一筆紀錄只會有其中一種)，性質上都是「這筆紀錄的
// 核心結果」，統一用同一種「數字+單位」視覺樣式呈現在第一行右側，不再讓如廁類型
// 用左側標籤徽章、飲水量卻用右側數字這種不一致的呈現方式。
// 如廁類型固定顯示「1」，因為快捷記錄的設計是「每次點擊=一筆單次事件」，
// 不是累加次數，所以這裡的1單純代表「這一筆」，不是從資料裡加總計算。

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

// 第一行右側的「主要數值」插槽：體重/飲水量/如廁類型互斥，統一用同一種樣式(大數字+單位)呈現
function PrimaryValue({ record }: { record: any }) {
  if (record.weight != null) {
    return (
      <span className="text-base font-bold text-gray-900">
        {record.weight}<span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
      </span>
    )
  }
  if (record.waterIntake != null) {
    return (
      <span className="text-base font-bold text-sky-600">
        {record.waterIntake}<span className="text-xs font-normal text-sky-400 ml-0.5">ml</span>
      </span>
    )
  }
  if (record.toiletType === '尿尿') {
    return (
      <span className="text-base font-bold text-blue-600">
        1<span className="text-xs font-normal text-blue-400 ml-0.5">尿尿</span>
      </span>
    )
  }
  if (record.toiletType === '大便') {
    return (
      <span className="text-base font-bold text-amber-700">
        1<span className="text-xs font-normal text-amber-500 ml-0.5">大便</span>
      </span>
    )
  }
  return null
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
              {/* 第一層：左側標籤(時段)+日期時間，右側主要數值(體重/飲水量/如廁類型三者互斥) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {record.timeSlot && (
                    <span className="inline-flex items-center rounded-full bg-gray-900 text-white text-xs font-medium px-2.5 py-1">
                      {record.timeSlot}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{formatRecordDateDisplay(record.recordDate)}</span>
                </div>
                <PrimaryValue record={record} />
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
