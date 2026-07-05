'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface ProjectionData {
  currentWeight: number
  targetWeight: number
  projection: {
    method: 'percentage' | 'fixed_kg'
    weeklyRatePercent: number
    weeklyLossKgAtStart: number
    weeksNeeded: number
    projectedDate: string | null
    isStalled: boolean
    monthOverMonthRateChange: number | null
  }
  breakthroughStrategies: Array<{ scenario: string; action: string }>
}

export default function WeightProjectionCard() {
  const [data, setData] = useState<ProjectionData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard/weight-projection')
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error || '讀取失敗')
        }
        setData(await res.json())
      } catch (err: any) {
        setError(err.message)
      }
    }
    load()
  }, [])

  if (error === 'notion_not_ready' || error === 'profile_not_found') {
    return null // 個人資料/生理紀錄尚未就緒時，不顯示這張卡片，避免版面出現一堆錯誤訊息
  }

  if (error === 'missing_weight_data') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold mb-2">目標達成日期預估</h3>
        <p className="text-gray-400 text-sm">請先在「個人資料」填寫目標體重，並在「生理紀錄」新增至少一筆體重紀錄</p>
      </div>
    )
  }

  if (error) return null
  if (!data) return <LoadingSpinner />

  const { currentWeight, targetWeight, projection, breakthroughStrategies } = data
  const methodLabel = projection.method === 'percentage' ? '體重百分比法' : '固定公斤法'

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold">目標達成日期預估</h3>
          <span className="text-xs bg-gray-50 text-gray-500 rounded-full px-3 py-1">
            採用「{methodLabel}」，週減重率約{projection.weeklyRatePercent}%
          </span>
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-gray-500">目前體重</p>
            <p className="text-xl font-bold">{currentWeight} kg</p>
          </div>
          <div>
            <p className="text-gray-500">目標體重</p>
            <p className="text-xl font-bold">{targetWeight} kg</p>
          </div>
          <div>
            <p className="text-gray-500">預估所需週數</p>
            <p className="text-xl font-bold">{projection.weeksNeeded} 週</p>
          </div>
          <div>
            <p className="text-gray-500">預估達成日期</p>
            <p className="text-xl font-bold">{projection.projectedDate ?? '—'}</p>
          </div>
        </div>

        {projection.method === 'fixed_kg' && (
          <p className="text-xs text-gray-400 mt-3">
            尚未累積連續2週的體重紀錄，暫用固定公斤法（每週約{projection.weeklyLossKgAtStart}kg）估算，累積足夠資料後會自動切換為更精準的體重百分比法
          </p>
        )}

        {projection.isStalled && (
          <div className="mt-4 bg-orange-50 text-orange-700 rounded-xl px-4 py-3 text-sm">
            <p className="font-medium">
              減重速度偏低{projection.monthOverMonthRateChange !== null && projection.monthOverMonthRateChange < 0 ? '，且相較上月已經放緩' : ''}，可能已進入停滯期
            </p>
          </div>
        )}
      </div>

      {breakthroughStrategies.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold mb-4">突破策略建議</h3>
          <div className="space-y-3">
            {breakthroughStrategies.map((s) => (
              <div key={s.scenario} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <span className="text-sm font-medium text-gray-700 sm:w-48 shrink-0">{s.scenario}</span>
                <span className="text-sm text-gray-500">{s.action}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            以上為通用策略清單，實際適用情境請自行對照近期紀錄判斷，非醫療建議
          </p>
        </div>
      )}
    </div>
  )
}

