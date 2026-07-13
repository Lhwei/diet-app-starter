'use client'

// 飲食儀表板：熱量儀表、三大營養素、六大類雷達圖、餐次堆疊圖、額外攝取趨勢
//
// 資料來源：
// - useDietSummary(days)    -> 主資料，近 N 天逐日飲食紀錄彙總
// - useProfileTarget()      -> 圖表目標值：calorieTarget、targetRatioText
//
// isInitialLoading 判斷邏輯說明：
// useProfileTarget() 沒有像 useDietSummary() 的 records 那種明確的
// 「尚無資料」標記（null），它的 fallback 是寫死的預設值（calorieTarget
// 預設 1600）。如果直接用 isTargetLoading 判斷是否顯示 LoadingSpinner，
// 會在「已經抓到過真實資料，之後背景重新驗證（例如切換分頁 focus 觸發
// revalidateOnFocus）」時，讓整個 dashboard 閃退回 LoadingSpinner，
// 違背 SWR「背景更新不打斷畫面」的設計初衷。這裡改成只在
// 「calorieTarget 仍是初始 fallback 值 1600 且 targetRatioText 為 null」
// 且「isTargetLoading 為 true」時，才視為真正的首次載入中。
//
// ⚠️ 型別說明（本次調整）：
// useDietSummary 現在是泛型 hook（見 useNotionData.ts），預設回傳
// NotionRecord[]（寬鬆型別），但下方 summarizeToday()/bucketByDay()（定義在
// lib/dashboard/aggregateDiet.ts）要求的參數型別是 DietRecordRaw[]（必填
// createdTime 等欄位）。這裡明確指定 useDietSummary<DietRecordRaw>(days)，
// 讓 records 直接是正確型別，不需要在呼叫 summarizeToday/bucketByDay 時
// 另外轉型。

import { useMemo } from 'react'
import CalorieTrendChart from './charts/CalorieTrendChart'
import MacroDonutChart from './charts/MacroDonutChart'
import SixCategoryRadarChart from './charts/SixCategoryRadarChart'
import CalorieGauge from './charts/CalorieGauge'
import MealStackedBarChart from './charts/MealStackedBarChart'
import ExtraIntakeTrendChart from './charts/ExtraIntakeTrendChart'
import {
  bucketByDay,
  summarizeToday,
  hasAnyExtraIntake,
  type DietRecordRaw,
} from '@/lib/dashboard/aggregateDiet'
import { useDietSummary, useProfileTarget } from '@/lib/hooks/useNotionData'
import LoadingSpinner from './LoadingSpinner'

interface Props {
  days: number
}

export default function DietDashboard({ days }: Props) {
  const {
    records,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useDietSummary<DietRecordRaw>(days)

  const {
    calorieTarget,
    targetRatioText,
    isLoading: isTargetLoading,
    error: targetError,
  } = useProfileTarget()

  // diet-summary 是主資料；profile-target 為圖表目標資料。
  // 任一失敗都必須顯示錯誤，避免圖表在缺少目標資料時默默使用錯誤結果。
  const error = summaryError ?? targetError
  const isInitialLoading =
    (isSummaryLoading && records === null) ||
    (isTargetLoading && calorieTarget === 1600 && targetRatioText === null)

  const todaySummary = useMemo(
    () => (records ? summarizeToday(records) : null),
    [records]
  )

  const dayBuckets = useMemo(
    () => (records ? bucketByDay(records, days) : []),
    [records, days]
  )

  const hasExtraIntake = useMemo(
    () => hasAnyExtraIntake(dayBuckets),
    [dayBuckets]
  )

  if (error?.message === 'notion_not_ready') {
    return (
      <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
        Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-red-600">
        讀取失敗：{error.message}
      </p>
    )
  }

  if (isInitialLoading || records === null || todaySummary === null) {
    return <LoadingSpinner />
  }

  if (records.length === 0) {
    return (
      <p className="text-gray-400">
        還沒有飲食紀錄，先到「飲食紀錄」頁面新增幾筆吧！
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CalorieGauge
          consumed={todaySummary.totalCalories}
          target={calorieTarget}
        />

        <MacroDonutChart
          protein={todaySummary.macros.protein}
          fat={todaySummary.macros.fat}
          carb={todaySummary.macros.carb}
          alcoholCalories={todaySummary.macros.alcoholCalories}
          targetRatioText={targetRatioText}
        />
      </div>

      <CalorieTrendChart
        data={dayBuckets}
        targetCalories={calorieTarget}
      />

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