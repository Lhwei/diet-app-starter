'use client'

// 完整生理紀錄列表（/physio 頁面用）
// 分頁模式讀取(/api/physio?limit=50&cursor=xxx)，超過50筆時「載入更多」串接下一批(cursor-based分頁)。
//
// 本次異動：新增/編輯/刪除成功後，除了呼叫 refresh()（更新這支列表自己的
// 分頁快取），也呼叫 invalidatePhysioCaches(dateKey)（更新其他頁面的
// SWR 快取，例如 DietRecordList.tsx 算當日飲水量用的 usePhysioRecordsByDate、
// PhysioDashboard.tsx 的趨勢圖、WeightProjectionCard.tsx 的最新體重）。
// 這兩套是完全獨立的資料流：refresh() 只刷新這支列表自己 useState 管理的
// 分頁資料，不會通知其他頁面的 SWR 快取；反過來 invalidatePhysioCaches()
// 也不會更新這支列表自己的分頁資料。兩者缺一，就會有某個畫面停留在舊資料。

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PhysioRecordForm from './PhysioRecordForm'
import LoadingSpinner from './LoadingSpinner'
import SwipeableRecordCard from './SwipeableRecordCard'
import { usePhysioRecordsPaginated, invalidatePhysioCaches } from '@/lib/hooks/useNotionData'

function formatRecordDateDisplay(recordDate: string): string {
  const date = new Date(recordDate)
  if (isNaN(date.getTime())) return recordDate
  return date.toLocaleString('zh-TW', { hour12: false })
}

// 從紀錄的 recordDate 算出 'YYYY-MM-DD'，供 handleDelete 呼叫
// invalidatePhysioCaches(dateKey) 用。recordDate 存的是 ISO 字串
// （見 PhysioRecordForm.tsx 存檔時用 toISOString()），直接切前10字元
// 會是 UTC 日期，跟本地日期可能有時區位移，但這裡只是用來精準定位
// 「哪一天的快取該失效」，即使因時區邊界差一天，最多是多刷新一天的快取，
// 不會漏刷新，可接受。
function toDateKeyFromIso(recordDate: string): string | undefined {
  if (!recordDate) return undefined
  const date = new Date(recordDate)
  if (isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

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

  function handleCreateSuccess(savedDateKey: string) {
    setShowForm(false)
    refresh()
    void invalidatePhysioCaches(savedDateKey)
  }

  function handleEditSuccess(savedDateKey: string) {
    setEditingRecord(null)
    refresh()
    void invalidatePhysioCaches(savedDateKey)
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這筆紀錄嗎？（會移至 Notion 垃圾桶）')) return

    // 刪除前先找出這筆紀錄的日期，刪除成功後才能精準呼叫
    // invalidatePhysioCaches(dateKey)，讓對應日期的單日快取一起刷新。
    const targetRecord = records.find((r: any) => r.id === id)
    const dateKey = targetRecord ? toDateKeyFromIso(targetRecord.recordDate) : undefined

    setDeletingId(id)
    try {
      const res = await fetch(`/api/physio/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || '刪除失敗')
      }
      refresh()
      void invalidatePhysioCaches(dateKey)
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