'use client'

import { useEffect, useMemo, useState } from 'react'
import CalorieTrendChart from './charts/CalorieTrendChart'
import MacroDonutChart from './charts/MacroDonutChart'
import SixCategoryRadarChart from './charts/SixCategoryRadarChart'
import CalorieGauge from './charts/CalorieGauge'
import MealStackedBarChart from './charts/MealStackedBarChart'
import ExtraIntakeTrendChart from './charts/ExtraIntakeTrendChart'
import { bucketByDay, summarizeToday, hasAnyExtraIntake, DietRecordRaw } from '@/lib/dashboard/aggregateDiet'
import LoadingSpinner from './LoadingSpinner'

interface Props {
  days: number
}

export default function DietDashboard({ days }: Props) {
  const [records, setRecords] = useState<DietRecordRaw[] | null>(null)
  const [calorieTarget, setCalorieTarget] = useState(1600)
  const [targetRatioText, setTargetRatioText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const [summaryRes, targetRes] = await Promise.all([
          fetch(`/api/dashboard/diet-summary?days=${days}`),
          fetch('/api/dashboard/profile-target'),
        ])

        if (!summaryRes.ok) {
          const body = await summaryRes.json()
          throw new Error(body.error || '讀取失敗')
        }

        const summaryData = await summaryRes.json()
        const targetData = await targetRes.json()

        if (cancelled) return
        setRecords(summaryData.records)
        setCalorieTarget(targetData.calorieTarget ?? 1600)
        setTargetRatioText(targetData.targetRatioText ?? null)
      } catch (err: any) {
        if (!cancelled) setError(err.message)
      }
    }
    load()
    return () => { cancelled = true }
  }, [days])

  const todaySummary = useMemo(() => (records ? summarizeToday(records) : null), [records])
  const dayBuckets = useMemo(() => (records ? bucketByDay(records, days) : []), [records, days])

  // 選定時間範圍內完全沒有糖/酒精/咖啡因攝取紀錄時，自動收合成精簡提示，不佔版面
  const hasExtraIntake = useMemo(() => hasAnyExtraIntake(dayBuckets), [dayBuckets])

  if (error === 'notion_not_ready') {
    return (
      <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
        Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
      </div>
    )
  }

  if (error) return <p className="text-red-600">讀取失敗：{error}</p>

  if (records === null || todaySummary === null) return <LoadingSpinner />

  if (records.length === 0) {
    return <p className="text-gray-400">還沒有飲食紀錄，先到「飲食紀錄」頁面新增幾筆吧！</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CalorieGauge consumed={todaySummary.totalCalories} target={calorieTarget} />
        <MacroDonutChart
          protein={todaySummary.macros.protein}
          fat={todaySummary.macros.fat}
          carb={todaySummary.macros.carb}
          alcoholCalories={todaySummary.macros.alcoholCalories}
          targetRatioText={targetRatioText}
        />
      </div>

      <CalorieTrendChart data={dayBuckets} targetCalories={calorieTarget} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SixCategoryRadarChart data={todaySummary.sixCategory} />
        <MealStackedBarChart data={dayBuckets} />
      </div>

      {hasExtraIntake ? (
        <ExtraIntakeTrendChart data={dayBuckets} />
      ) : (
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-400">
          這段時間沒有糖／酒精／咖啡因攝取紀錄，圖表已自動收合
        </div>
      )}
    </div>
  )
}
