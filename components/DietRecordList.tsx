'use client'

// App式飲食紀錄查看：上方週曆選日期，下方顯示「選中那一天」的紀錄
//
// DietRecordList
// ├─ useDietRecordsByDate(dateKey)       -> 該日飲食紀錄
// ├─ usePhysioRecordsByDate(dateKey)     -> 該日飲水／如廁等生理紀錄
// ├─ usePhysioSummary(90)                -> 找「最近一次有體重數值」的紀錄，
// │                                          用來動態算飲水量目標範圍（體重*30~40）
// └─ DailyNutritionSummary
//    ├─ records
//    ├─ waterIntakeMl
//    └─ latestWeightKg
//
// 本次異動（UI-only，資料邏輯完全不動）：
// WeekCalendarHeader + DailyNutritionSummary 一起包進同一個 sticky top-0
// 容器，滑動紀錄列表時兩者常駐頂部不被推走。原因：飲食紀錄是「以日期為
// 主軸瀏覽」的介面，週曆本身是主要導航元件，理應隨時可見；當日摘要則讓
// 使用者滑到列表任何位置都能掌握今天的熱量/飲水進度，不需要滑回最上面。
// 兩者包在同一個容器裡一起 sticky（而非各自 sticky），是為了避免手動計算
// 第二個元件的 top 偏移量（需精準等於第一個元件的高度），日後任一元件
// 高度變動都要同步改另一處 top 值，容易出錯又難維護。
//
// z-20 是為了蓋過紀錄列表本身（列表本身沒有設 z-index，預設為
// auto，實際疊放順序看 DOM順序，此處明確設定 z-index 避免列表卡片的陰影
// 或其他堆疊上下文意外蓋到 sticky 容器上方）。

import { useEffect, useState } from 'react'
import DietRecordForm from './DietRecordForm'
import LoadingSpinner from './LoadingSpinner'
import WeekCalendarHeader from './WeekCalendarHeader'
import DailyNutritionSummary from './DailyNutritionSummary'
import SwipeableRecordCard from './SwipeableRecordCard'
import { toDateKey } from '@/lib/date/weekUtils'
import {
  invalidateDietCaches,
  useDietRecordsByDate,
  usePhysioRecordsByDate,
  usePhysioSummary,
} from '@/lib/hooks/useNotionData'
import { useSearchParams, useRouter } from 'next/navigation'

function buildDefaultRecordDate(selectedDate: Date): Date {
  const now = new Date()
  const result = new Date(selectedDate)
  result.setHours(now.getHours(), now.getMinutes(), 0, 0)
  return result
}

export default function DietRecordList() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const dateKey = toDateKey(selectedDate)

  const {
    records,
    isLoading,
    error,
  } = useDietRecordsByDate(dateKey)

  const {
    records: physioRecords,
    isLoading: isPhysioLoading,
    error: physioError,
  } = usePhysioRecordsByDate(dateKey)

  const {
    records: recentPhysioRecords,
    isLoading: isWeightLoading,
  } = usePhysioSummary<PhysioRecordRaw>(90)

  const latestWeightKg = (() => {
    if (!recentPhysioRecords) return null

    const withWeight = recentPhysioRecords.filter(
      (record: any) => record.weight != null && !Number.isNaN(Number(record.weight))
    )

    if (withWeight.length === 0) return null

    const sorted = [...withWeight].sort((a: any, b: any) =>
      a.recordDate < b.recordDate ? 1 : -1
    )

    return Number(sorted[0].weight)
  })()

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      router.replace('/diet')
    }
  }, [searchParams, router])

  function handleCreateSuccess(savedDateKey: string) {
    setShowForm(false)
    void invalidateDietCaches(savedDateKey)
    if (savedDateKey !== dateKey) {
      void invalidateDietCaches(dateKey)
    }
  }

  function handleEditSuccess(savedDateKey: string) {
    setEditingRecord(null)

    void invalidateDietCaches(dateKey)
    if (savedDateKey !== dateKey) {
      void invalidateDietCaches(savedDateKey)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這筆紀錄嗎？（會移至 Notion 垃圾桶）')) {
      return
    }

    setDeletingId(id)

    try {
      const res = await fetch(`/api/diet/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || body.message || '刪除失敗')
      }

      void invalidateDietCaches(dateKey)
    } catch (err: any) {
      alert(err.message || '刪除失敗')
    } finally {
      setDeletingId(null)
    }
  }

  const safeRecords = records ?? []

  const waterIntakeMl = physioError
    ? null
    : (physioRecords ?? [])
        .filter((record: any) => String(record.recordDate).slice(0, 10) === dateKey)
        .reduce(
          (sum: number, record: any) => sum + (Number(record.waterIntake) || 0),
          0
        )

  const isInitialLoading = isLoading && records === null

  const showSummary =
    !isInitialLoading &&
    !error &&
    !editingRecord &&
    !showForm &&
    records !== null

  return (
    <div>
      {/* sticky 容器：週曆 + 當日摘要一起常駐頂部，內部維持一般排列，
          間距用 gap-2 (0.5rem) 取代原本較寬的 space-y-5，讓整塊常駐區域
          在直向空間有限的手機畫面上盡量精簡，把可視高度留給下方列表 */}
      <div className="sticky md:static top-0 z-20 bg-gray-50 py-2 -mx-4 px-4 space-y-2 md:space-y-4">
        <WeekCalendarHeader
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {showSummary && (
          <DailyNutritionSummary
            records={safeRecords}
            waterIntakeMl={waterIntakeMl}
            isWaterLoading={isPhysioLoading}
            latestWeightKg={latestWeightKg}
            isWeightLoading={isWeightLoading}
          />
        )}
      </div>

      <div className="pt-2">
        {isInitialLoading ? (
          <LoadingSpinner />
        ) : error?.message === 'notion_not_ready' ? (
          <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
            Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
          </div>
        ) : error ? (
          <p className="text-red-600">
            讀取失敗：{error.message}
          </p>
        ) : editingRecord ? (
          <DietRecordForm
            recordId={editingRecord.id}
            initialValues={editingRecord}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingRecord(null)}
          />
        ) : showForm ? (
          <DietRecordForm
            initialValues={{ recordDate: buildDefaultRecordDate(selectedDate) }}
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <div className="space-y-4">
            {safeRecords.length === 0 && (
              <p className="text-gray-400">
                這天還沒有任何紀錄，點上面按鈕新增第一筆吧！
              </p>
            )}

            <div className="space-y-3">
              {safeRecords.map((record: any) => (
                <SwipeableRecordCard
                  key={record.id}
                  onEdit={() => setEditingRecord(record)}
                  onDelete={() => handleDelete(record.id)}
                  isDeleting={deletingId === record.id}
                >
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {record.mealType && (
                          <span className="inline-flex items-center rounded-full bg-gray-900 text-white text-xs font-medium px-2.5 py-1">
                            {record.mealType}
                          </span>
                        )}

                        <span className="text-xs text-gray-400">
                          {record.recordTitle}
                        </span>
                      </div>

                      {record.calories != null && (
                        <span className="text-base font-bold text-gray-900">
                          {record.calories}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">
                            kcal
                          </span>
                        </span>
                      )}
                    </div>

                    {record.foodContent && (
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {record.foodContent}
                      </p>
                    )}

                    {(record.protein != null ||
                      record.fat != null ||
                      record.carb != null) && (
                      <div className="flex gap-2 pt-0.5">
                        {record.protein != null && (
                          <span
                            className={`text-xs rounded-md px-2 py-1 font-medium ${
                              Number(record.protein) < 20
                                ? 'bg-amber-50 text-amber-700'
                                : Number(record.protein) > 40
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            蛋白質 {record.protein}g
                          </span>
                        )}

                        {record.fat != null && (
                          <span className="text-xs rounded-md px-2 py-1 font-medium bg-gray-50 text-gray-600">
                            脂質 {record.fat}g
                          </span>
                        )}

                        {record.carb != null && (
                          <span className="text-xs rounded-md px-2 py-1 font-medium bg-gray-50 text-gray-600">
                            碳水 {record.carb}g
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </SwipeableRecordCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}