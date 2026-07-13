'use client'

// 飲水量 + 咖啡因 合併趨勢圖（常駐於「每日總覽」區塊）
//
// 設計理由：兩者都跟「補水/提神」的日常習慣相關，放在同一張圖用雙Y軸比較，
// 比拆成兩張更容易看出關聯性（例如靠咖啡因提神的那幾天，水喝得夠不夠）。
// 飲水量(ml，連續大量)用柱狀圖走左軸；咖啡因(杯，離散小單位)用折線走右軸。
//
// 資料來源跨界：飲水量來自生理紀錄(usePhysioSummary)，咖啡因來自飲食紀錄
// (useDietSummary)，兩者是不同資料庫。這裡各自呼叫獨立的 SWR hook 並依日期
// 合併，不影響DietDashboard/PhysioDashboard/WaterToiletChart各自既有的資料流
// ——事實上因為 SWR key 相同（同樣是 usePhysioSummary(days)/useDietSummary(days)），
// 只要其他元件曾經用相同 days 抓過，這裡會直接吃共用快取，不會重複打 API。
//
// ⚠️ 容錯設計：飲水量(physio)是主資料，讀取失敗要整張圖擋掉；咖啡因(diet)
// 讀取失敗則靜默降級成 0（維持原本行為），因為這張圖的核心是飲水量，
// 咖啡因只是輔助資訊，不應該因為飲食API暫時出問題就讓飲水趨勢也看不到。

import { useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import { bucketHealthBehaviorByDay } from '@/lib/dashboard/aggregatePhysio'
import { bucketByDay, type DietRecordRaw } from '@/lib/dashboard/aggregateDiet'
import { type PhysioRecordRaw } from '@/lib/dashboard/aggregatePhysio'
import { usePhysioSummary, useDietSummary } from '@/lib/hooks/useNotionData'
import LoadingSpinner from '../LoadingSpinner'

interface Props {
  days: number
  targetMl?: number
}

export default function WaterCaffeineChart({ days, targetMl = 2500 }: Props) {
  const {
    records: physioRecords,
    isLoading: isPhysioLoading,
    error: physioError,
  } = usePhysioSummary<PhysioRecordRaw>(days)

  const {
    records: dietRecords,
    error: dietError,
  } = useDietSummary<DietRecordRaw>(days)

  // 咖啡因讀取失敗時靜默降級成空陣列，維持原本「diet API 失敗不擋圖」的行為。
  const safeDietRecords = dietError ? [] : (dietRecords ?? [])

  const chartData = useMemo(() => {
    if (!physioRecords) return []
    const waterBuckets = bucketHealthBehaviorByDay(physioRecords, days)
    const caffeineBuckets = bucketByDay(safeDietRecords, days)
    const caffeineByDate = new Map(caffeineBuckets.map((b) => [b.date, b.caffeineServings]))
    return waterBuckets.map((b) => ({
      label: b.label,
      飲水量: b.waterIntake,
      咖啡因: caffeineByDate.get(b.date) ?? 0,
    }))
  }, [physioRecords, safeDietRecords, days])

  if (physioError?.message === 'notion_not_ready') return null
  if (physioError) return <p className="text-red-600 text-sm">飲水/咖啡因資料讀取失敗：{physioError.message}</p>
  if (isPhysioLoading && physioRecords === null) return <LoadingSpinner />
  if (physioRecords === null) return null

  const totalWater = chartData.reduce((sum, d) => sum + d.飲水量, 0)
  const totalCaffeine = chartData.reduce((sum, d) => sum + d.咖啡因, 0)
  const daysWithWater = chartData.filter((d) => d.飲水量 > 0).length
  const avgWater = daysWithWater > 0 ? Math.round(totalWater / daysWithWater) : 0

  if (totalWater === 0 && totalCaffeine === 0) {
    return (
      <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-400">
        這段時間沒有飲水量或咖啡因攝取紀錄，先到「生理紀錄」「飲食紀錄」頁面新增看看！
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold">飲水量與咖啡因趨勢</h3>
        <span className="text-xs rounded-full px-3 py-1 bg-blue-50 text-blue-600">
          平均飲水 {avgWater}ml ・ 咖啡因累計 {Math.round(totalCaffeine * 10) / 10}杯
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis yAxisId="water" tick={{ fontSize: 11 }} width={40} />
          <YAxis yAxisId="caffeine" orientation="right" tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            yAxisId="water"
            y={targetMl}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            label={{ value: `目標 ${targetMl}ml`, position: 'insideTopRight', fontSize: 11, fill: '#3b82f6' }}
          />
          <Bar yAxisId="water" dataKey="飲水量" fill="#93c5fd" radius={[3, 3, 0, 0]} barSize={14} />
          <Line yAxisId="caffeine" type="monotone" dataKey="咖啡因" stroke="#78716c" strokeWidth={2} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}