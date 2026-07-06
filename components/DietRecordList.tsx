'use client'

// App式飲食紀錄查看：上方週曆選日期，下方顯示「選中那一天」的紀錄
// 改用 /api/diet?date=YYYY-MM-DD 單日查詢，不再抓固定天數範圍

import { useEffect, useState, useCallback } from 'react'
import DietRecordForm from './DietRecordForm'
import LoadingSpinner from './LoadingSpinner'
import WeekCalendarHeader from './WeekCalendarHeader'
import DailyNutritionSummary from './DailyNutritionSummary'
import SwipeableRecordCard from './SwipeableRecordCard'
import { toDateKey } from '@/lib/date/weekUtils'

export default function DietRecordList() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const dateKey = toDateKey(selectedDate)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/diet?date=${dateKey}`)
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
  }, [dateKey])

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

  const totalCalories = records.reduce((sum, r) => sum + (Number(r.calories) || 0), 0)

  return (
    <div className="space-y-5">
      <WeekCalendarHeader selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {!loading && !error && !editingRecord && !showForm && (
        <DailyNutritionSummary records={records} />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : error === 'notion_not_ready' ? (
        <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
          Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
        </div>
      ) : error ? (
        <p className="text-red-600">讀取失敗：{error}</p>
      ) : editingRecord ? (
        <DietRecordForm
          recordId={editingRecord.id}
          initialValues={editingRecord}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingRecord(null)}
        />
      ) : showForm ? (
        <DietRecordForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowForm(true)}
              className="bg-black text-white rounded-xl px-5 py-2.5 font-medium hover:opacity-90 transition"
            >
              + 新增飲食紀錄
            </button>
            {records.length > 0 && (
              <p className="text-sm text-gray-500">當日總熱量：<strong>{totalCalories} kcal</strong></p>
            )}
          </div>

          {records.length === 0 && (
            <p className="text-gray-400">這天還沒有任何紀錄，點上面按鈕新增第一筆吧！</p>
          )}

          <div className="space-y-3">
            {records.map((record) => (
              <SwipeableRecordCard
                key={record.id}
                onEdit={() => setEditingRecord(record)}
                onDelete={() => handleDelete(record.id)}
                isDeleting={deletingId === record.id}
              >
                <div className="p-4 space-y-2.5">
                  {/* 第一層：餐別(主標籤) + 時間(次要資訊)，一眼看出「這是哪一餐、幾點吃的」 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {record.mealType && (
                        <span className="inline-flex items-center rounded-full bg-gray-900 text-white text-xs font-medium px-2.5 py-1">
                          {record.mealType}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{record.recordTitle}</span>
                    </div>
                    {record.calories != null && (
                      <span className="text-base font-bold text-gray-900">{record.calories}<span className="text-xs font-normal text-gray-400 ml-0.5">kcal</span></span>
                    )}
                  </div>

                  {/* 第二層：食物內容，主要閱讀資訊，字級稍大、顏色最深 */}
                  {record.foodContent && (
                    <p className="text-sm text-gray-800 leading-relaxed">{record.foodContent}</p>
                  )}

                  {/* 第三層：三大營養素，次要輔助資訊，用小型chip呈現，蛋白質依門檻變色 */}
                  {(record.protein != null || record.fat != null || record.carb != null) && (
                    <div className="flex gap-2 pt-0.5">
                      {record.protein != null && (
                        <span className={`text-xs rounded-md px-2 py-1 font-medium ${
                          Number(record.protein) < 20
                            ? 'bg-amber-50 text-amber-700'
                            : Number(record.protein) > 40
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-50 text-gray-600'
                        }`}>
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
