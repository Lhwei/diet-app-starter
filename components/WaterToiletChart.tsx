'use client'

// 飲水/咖啡因 + 如廁次數 常駐圖表容器
//
// 改用 usePhysioSummary(days) 取代原本的 useEffect + fetch。
//
// ⚠️ 原始設計理由已隨 SWR 化調整：舊注解說「這裡統一fetch一次physio資料
// 傳給如廁圖，避免同一份physio-summary API被WaterCaffeineChart內部跟這裡
// 重複打兩次」，這是手動fetch時代的考量。現在WaterCaffeineChart.tsx內部
// 已改用同一支 usePhysioSummary(days) hook，SWR會自動依相同 key
// （'/api/dashboard/physio-summary?days=N'）共用快取與request，不管
// 有幾個元件呼叫，實際只會真正打一次API，不會重複打。
// 這裡繼續統一計算 buckets 往下傳給 ToiletStackedBarChart，只是為了維持
// 現有元件介面（ToiletStackedBarChart 目前吃的是算好的 buckets，不是
// 原始 records），並非為了節省API額度。
//
// ⚠️ 型別說明（本次調整）：
// usePhysioSummary 是泛型 hook（見 useNotionData.ts），預設回傳
// NotionRecord[]（寬鬆型別），但下方 bucketHealthBehaviorByDay()（定義在
// lib/dashboard/aggregatePhysio.ts）要求的參數型別是 PhysioRecordRaw[]（必填
// createdTime 等欄位）。這裡明確指定 usePhysioSummary<PhysioRecordRaw>(days)，
// 讓 records 直接是正確型別，跟 PhysioDashboard.tsx 的做法保持一致。

import { useMemo } from 'react'
import WaterCaffeineChart from './charts/WaterCaffeineChart'
import ToiletStackedBarChart from './charts/ToiletStackedBarChart'
import { bucketHealthBehaviorByDay, type PhysioRecordRaw } from '@/lib/dashboard/aggregatePhysio'
import { usePhysioSummary } from '@/lib/hooks/useNotionData'
import LoadingSpinner from './LoadingSpinner'

interface Props {
  days: number
}

export default function WaterToiletChart({ days }: Props) {
  const { records, isLoading, error } = usePhysioSummary<PhysioRecordRaw>(days)

  const buckets = useMemo(
    () => (records ? bucketHealthBehaviorByDay(records, days) : []),
    [records, days]
  )

  if (error?.message === 'notion_not_ready') return null
  if (error) return <p className="text-danger text-sm">生理資料讀取失敗：{error.message}</p>
  if (isLoading && records === null) return <LoadingSpinner />
  if (records === null) return null

  return (
    <div className="space-y-5">
      <WaterCaffeineChart days={days} />
      <ToiletStackedBarChart data={buckets} />
    </div>
  )
}