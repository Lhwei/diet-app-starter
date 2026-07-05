'use client'

import { useEffect, useState } from 'react'
import CalorieTrendChart from './charts/CalorieTrendChart'
import MacroDonutChart from './charts/MacroDonutChart'
import SixCategoryRadarChart from './charts/SixCategoryRadarChart'
import CalorieGauge from './charts/CalorieGauge'
import MealStackedBarChart from './charts/MealStackedBarChart'
import { bucketByDay, summarizeToday, DietRecordRaw } from '@/lib/dashboard/aggregateDiet'
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

  if (error === 'notion_not_ready') {
    return (
      <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
        Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
      </div>
    )
  }

  if (error) return <p className="text-red-600">讀取失敗：{error}</p>

  if (records === null) return <LoadingSpinner />

  if (records.length === 0) {
    return <p className="text-gray-400">還沒有飲食紀錄，先到「飲食紀錄」頁面新增幾筆吧！</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CalorieGauge consumed={summarizeToday(records).totalCalories} target={calorieTarget} />
        <MacroDonutChart
          protein={summarizeToday(records).macros.protein}
          fat={summarizeToday(records).macros.fat}
          carb={summarizeToday(records).macros.carb}
          targetRatioText={targetRatioText}
        />
      </div>

      <CalorieTrendChart data={bucketByDay(records, days)} targetCalories={calorieTarget} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SixCategoryRadarChart data={summarizeToday(records).sixCategory} />
        <MealStackedBarChart data={bucketByDay(records, days)} />
      </div>
    </div>
  )
}
