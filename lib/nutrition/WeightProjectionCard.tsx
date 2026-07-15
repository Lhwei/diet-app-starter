'use client'

// 目標體重達成日期預估卡片
//
// 改用 useWeightProjection() 取代原本的 useEffect + fetch。
// 這支 hook 跟 ProfilePageContainer.tsx 存檔後呼叫的 invalidateProfileCaches()
// 共用同一個 SWR key（'/api/dashboard/weight-projection'），使用者更新目標
// 體重或新增體重紀錄後，這裡會自動收到最新預估，不需要額外處理。
//
// ⚠️ 命名提醒：useWeightProjection() 回傳的欄位叫 projection，但它實際上是
// 整包 API 回應（含 currentWeight/targetWeight/projection/breakthroughStrategies），
// 不是巢狀的 projection.xxx。這裡重新命名為 data，避免跟內部的
// data.projection（週數/日期等實際預估細節）搞混。

import LoadingSpinner from '@/components/LoadingSpinner'
import { useWeightProjection } from '@/lib/hooks/useNotionData'

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
  const { projection: data, isLoading, error } = useWeightProjection() as {
    projection: ProjectionData | null
    isLoading: boolean
    error: Error | undefined
  }

  if (error?.message === 'notion_not_ready' || error?.message === 'profile_not_found') {
    return null // 個人資料/生理紀錄尚未就緒時，不顯示這張卡片，避免版面出現一堆錯誤訊息
  }

  if (error?.message === 'missing_weight_data') {
    return (
      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold mb-2">目標達成日期預估</h3>
        <p className="text-text-subtle text-sm">請先在「個人資料」填寫目標體重，並在「生理紀錄」新增至少一筆體重紀錄</p>
      </div>
    )
  }

  if (error) return null

  // isLoading && data === null：SWR 尚無可用資料，首次載入中。
  // 若已有快取，data 不會是 null，會直接顯示上一次資料，不會卡在 LoadingSpinner。
  if (isLoading && data === null) return <LoadingSpinner />
  if (!data) return null

  const { currentWeight, targetWeight, projection, breakthroughStrategies } = data
  const methodLabel = projection.method === 'percentage' ? '體重百分比法' : '固定公斤法'

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold">目標達成日期預估</h3>
          <span className="text-xs bg-background text-text-muted rounded-full px-3 py-1">
            採用「{methodLabel}」，週減重率約{projection.weeklyRatePercent}%
          </span>
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-text-muted">目前體重</p>
            <p className="text-xl font-bold">{currentWeight} kg</p>
          </div>
          <div>
            <p className="text-text-muted">目標體重</p>
            <p className="text-xl font-bold">{targetWeight} kg</p>
          </div>
          <div>
            <p className="text-text-muted">預估所需週數</p>
            <p className="text-xl font-bold">{projection.weeksNeeded} 週</p>
          </div>
          <div>
            <p className="text-text-muted">預估達成日期</p>
            <p className="text-xl font-bold">{projection.projectedDate ?? '—'}</p>
          </div>
        </div>

        {projection.method === 'fixed_kg' && (
          <p className="text-xs text-text-subtle mt-3">
            尚未累積連續2週的體重紀錄，暫用固定公斤法（每週約{projection.weeklyLossKgAtStart}kg）估算，累積足夠資料後會自動切換為更精準的體重百分比法
          </p>
        )}

        {projection.isStalled && (
          <div className="mt-4 bg-warning-soft text-warning-hover rounded-xl px-4 py-3 text-sm">
            <p className="font-medium">
              減重速度偏低{projection.monthOverMonthRateChange !== null && projection.monthOverMonthRateChange < 0 ? '，且相較上月已經放緩' : ''}，可能已進入停滯期
            </p>
          </div>
        )}
      </div>

      {breakthroughStrategies.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold mb-4">突破策略建議</h3>
          <div className="space-y-3">
            {breakthroughStrategies.map((s) => (
              <div key={s.scenario} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                <span className="text-sm font-medium text-text-body sm:w-48 shrink-0">{s.scenario}</span>
                <span className="text-sm text-text-muted">{s.action}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-subtle mt-3">
            以上為通用策略清單，實際適用情境請自行對照近期紀錄判斷，非醫療建議
          </p>
        </div>
      )}
    </div>
  )
}