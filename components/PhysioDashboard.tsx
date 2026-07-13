'use client'

// 生理紀錄儀表板：體重/體脂/BMI/腰圍四張趨勢圖
//
// 改用 SWR hooks 取代原本的 useEffect + Promise.all + fetch：
// - usePhysioSummary(days)  -> 生理紀錄本體 + heightCm（Notion量到的身高，優先權較高）
// - useProfileTarget()      -> 個人資料設定的目標值：targetWeight、gender、
//                               waistHealthyMax、heightCm（身高的 fallback 來源）
//
// 這兩支 hook 各自的 SWR key 跟 DietRecordList.tsx、DailyNutritionSummary.tsx
// 用到的完全相同（同樣呼叫 usePhysioSummary(90) 或 useProfileTarget()），
// 只要 days 參數一致，就會自動共用快取，不會重複發 request。
//
// heightCm 的 fallback 邏輯維持原本設計：優先用生理紀錄本身量到的身高
// （physio-summary 回傳），若使用者從未在生理紀錄裡填過身高，才退回
// 個人資料設定裡填寫的身高（profile-target 回傳）。

import WeightTrendChart from './charts/WeightTrendChart'
import BodyFatTrendChart from './charts/BodyFatTrendChart'
import BmiTrendChart from './charts/BmiTrendChart'
import WaistTrendChart from './charts/WaistTrendChart'
import { buildTrendPoints } from '@/lib/dashboard/aggregatePhysio'
import LoadingSpinner from './LoadingSpinner'
import { usePhysioSummary, useProfileTarget } from '@/lib/hooks/useNotionData'

interface Props {
  days: number
}

export default function PhysioDashboard({ days }: Props) {
  const {
    records,
    heightCm: physioHeightCm,
    isLoading: isPhysioLoading,
    error: physioError,
  } = usePhysioSummary(days)

  const {
    targetWeight,
    gender,
    waistHealthyMax,
    heightCm: profileHeightCm,
    isLoading: isProfileLoading,
    error: profileError,
  } = useProfileTarget()

  const error = physioError || profileError
  const isInitialLoading = (isPhysioLoading && records === null) || (isProfileLoading && targetWeight === null && gender === null)
  
  if (error?.message === 'notion_not_ready') {
    return (
      <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
        Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
      </div>
    )
  }

  if (error) return <p className="text-red-600">讀取失敗：{error.message}</p>

  if (isInitialLoading || records === null) return <LoadingSpinner />

  if (records.length === 0) {
    return <p className="text-gray-400">還沒有生理紀錄，先到「生理紀錄」頁面新增幾筆體重/腰圍紀錄吧！</p>
  }

  // 身高優先用生理紀錄實際量到的數值，沒有才退回個人資料設定的身高。
  const heightCm = physioHeightCm ?? profileHeightCm ?? null

  const trendPoints = buildTrendPoints(records, heightCm)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <WeightTrendChart data={trendPoints} targetWeight={targetWeight} />
      <BodyFatTrendChart data={trendPoints} gender={gender} />
      <BmiTrendChart data={trendPoints} hasHeight={heightCm !== null} />
      <WaistTrendChart data={trendPoints} waistHealthyMax={waistHealthyMax} />
    </div>
  )
}