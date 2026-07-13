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
// 本次異動：新增紀錄時，「記錄日期時間」欄位預設帶入「目前瀏覽的週曆日期」
// + 「現在的時分」，而不是單純 new Date()（今天）。原因：DietRecordForm
// 沒收到 initialValues 時，內部會用 new Date() 當預設日期，導致使用者
// 瀏覽 7/10 時點新增，表單卻預設顯示今天（例如 7/13），一不注意就把紀錄
// 存到錯誤的一天，畫面上（仍停留在 7/10）也看不到剛新增的紀錄。

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

// 新增紀錄時，「記錄日期時間」欄位預設帶入「目前瀏覽的週曆日期」+「現在的
// 時分」，而不是單純的 new Date()（今天）。這樣使用者在瀏覽 7/10 時點新增，
// 表單日期會直接顯示 7/10 而非今天，避免不小心把紀錄存到錯誤的一天。
// 仍保留「現在的時分」而非固定 00:00，是為了讓 mealType 的時段自動建議
// （suggestMealTypeByTime）維持準確，且使用者仍可手動調整成補登的實際時間。
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

  // 找「最近一次有體重數值」的紀錄，用來動態算飲水量目標範圍（體重*30~40）。
  // 這跟上面「當日飲水量」是完全不同的查詢：不限於選取日期，只看時間上最新一筆有體重的紀錄，
  // 所以不能沿用 usePhysioRecordsByDate(dateKey) 的結果。
  const {
    records: recentPhysioRecords,
    isLoading: isWeightLoading,
  } = usePhysioSummary(90)

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

  // 讓「飲食紀錄」頁面能被 ?new=1 觸發開表單
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      router.replace('/diet')
    }
  }, [searchParams, router])

  // 新增紀錄：savedDateKey 是表單實際存入的記錄日期。因為新增表單現在會
  // 預帶「目前瀏覽的週曆日期」，正常情況下 savedDateKey 會等於 dateKey；
  // 但使用者仍可能手動把日期改成別的一天（例如臨時想補登昨天），所以這裡
  // 保留跟編輯一致的雙日期刷新邏輯，不假設兩者必然相同。
  function handleCreateSuccess(savedDateKey: string) {
    setShowForm(false)
    void invalidateDietCaches(savedDateKey)
    if (savedDateKey !== dateKey) {
      void invalidateDietCaches(dateKey)
    }
  }

  // 編輯紀錄：表單允許使用者把記錄日期改到別的一天（例如把 7/12 的紀錄
  // 改成 7/13）。savedDateKey 是編輯後實際存入的日期，若跟目前畫面看的
  // dateKey 不同，代表這筆紀錄跨日搬動了，舊日期跟新日期的單日快取都要
  // 刷新：舊日期要讓這筆紀錄消失，新日期要讓這筆紀錄出現。
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

      // 不手動 setRecords 過濾；統一由 SWR 重新驗證快取資料。
      void invalidateDietCaches(dateKey)
    } catch (err: any) {
      alert(err.message || '刪除失敗')
    } finally {
      setDeletingId(null)
    }
  }

  // records 為 null：SWR 尚無該日期可用資料。
  // records 為 []：API 已成功回應，但這天確實沒有紀錄。
  const safeRecords = records ?? []

  // 飲水資料是輔助資訊；生理 API 暫時失敗時，不應阻擋飲食紀錄與營養摘要顯示。
  // 這裡不完全信任 API 已經依日期篩好，額外用 recordDate 再次過濾，
  // 避免後端篩選邏輯有誤或日期格式含時間戳記造成加總到別天的資料。
  const waterIntakeMl = physioError
    ? null
    : (physioRecords ?? [])
        .filter((record: any) => String(record.recordDate).slice(0, 10) === dateKey)
        .reduce(
          (sum: number, record: any) => sum + (Number(record.waterIntake) || 0),
          0
        )

  const isInitialLoading = isLoading && records === null

  return (
    <div className="space-y-5">
      <WeekCalendarHeader
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {!isInitialLoading &&
        !error &&
        !editingRecord &&
        !showForm &&
        records !== null && (
          <DailyNutritionSummary
            records={safeRecords}
            waterIntakeMl={waterIntakeMl}
            isWaterLoading={isPhysioLoading}
            latestWeightKg={latestWeightKg}
            isWeightLoading={isWeightLoading}
          />
        )}

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
            {safeRecords.map((record) => (
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
  )
}