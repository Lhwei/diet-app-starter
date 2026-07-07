// 體重目標達成日期預估邏輯
//
// 兩種預估方法：
// 1. 固定公斤法（資料不足時的預設）：以目前體重 × 預設速率(0.5%) 算出「固定的每週減重公斤數」，
//    整段期間都用這個固定數字往下推，不會因為體重降低而調整（比較粗略，但沒有足夠歷史資料時只能先這樣估）
// 2. 體重百分比法（有連續2週以上生理紀錄時自動切換）：每週減重量 = 當週體重 × 減重率%，
//    因為體重會逐週下降，所以減重量也會逐週縮小（更貼近生理真實狀況），
//    減重率是從隊長最近的生理紀錄「回推估算」出來的實際速率，不是憑空假設
//
// 修正記錄：原本 bucketWeightByWeek 用 Notion 頁面的 createdTime（建立時間）分週，
// 但「記錄日期」欄位已經可以手動改成過去日期（補登舊報告），createdTime跟記錄日期會脫鉤，
// 造成分週結果錯亂、平均出從未真正填寫過的體重數字。改成統一使用 recordDate（ISO格式字串）分週。

export interface WeeklyWeightPoint {
  weekStart: string // yyyy-MM-dd，該週週一日期
  avgWeight: number
}

export interface WeightProjectionResult {
  method: 'percentage' | 'fixed_kg'
  weeklyRatePercent: number
  weeklyLossKgAtStart: number
  weeksNeeded: number
  projectedDate: string | null
  isStalled: boolean
  monthOverMonthRateChange: number | null
}

const MIN_HEALTHY_RATE = 0.0025
const DEFAULT_FIXED_RATE = 0.005

// 把生理紀錄依「週」分桶並取平均體重，週的定義為週一到週日（ISO週）
// 改用 recordDate（使用者實際填寫/手動指定的記錄日期）而非 createdTime（Notion頁面建立時間）
export function bucketWeightByWeek(records: Array<{ recordDate: string; weight?: number }>): WeeklyWeightPoint[] {
  const weekMap = new Map<string, number[]>()

  for (const r of records) {
    if (r.weight === undefined || r.weight === null) continue
    const date = new Date(r.recordDate)
    if (isNaN(date.getTime())) continue // 記錄日期格式異常時直接跳過，不納入計算避免污染平均值

    const dayOfWeek = date.getUTCDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(date)
    monday.setUTCDate(date.getUTCDate() + diffToMonday)
    const weekKey = monday.toISOString().slice(0, 10)

    if (!weekMap.has(weekKey)) weekMap.set(weekKey, [])
    weekMap.get(weekKey)!.push(r.weight)
  }

  return Array.from(weekMap.entries())
    .map(([weekStart, weights]) => ({
      weekStart,
      avgWeight: Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

export function hasEnoughDataForPercentageMethod(weeklyPoints: WeeklyWeightPoint[]): boolean {
  if (weeklyPoints.length < 2) return false
  const last = weeklyPoints[weeklyPoints.length - 1]
  const secondLast = weeklyPoints[weeklyPoints.length - 2]

  const lastMonday = new Date(last.weekStart)
  const secondLastMonday = new Date(secondLast.weekStart)
  const diffDays = (lastMonday.getTime() - secondLastMonday.getTime()) / (1000 * 60 * 60 * 24)

  return diffDays === 7
}

function estimateWeeklyRateFromTrend(weeklyPoints: WeeklyWeightPoint[]): number {
  const recentWeeks = weeklyPoints.slice(-4)
  if (recentWeeks.length < 2) return DEFAULT_FIXED_RATE

  const first = recentWeeks[0].avgWeight
  const lastPoint = recentWeeks[recentWeeks.length - 1].avgWeight
  const numWeeks = recentWeeks.length - 1

  if (first <= 0 || numWeeks <= 0) return DEFAULT_FIXED_RATE

  const ratio = lastPoint / first
  const rate = 1 - Math.pow(ratio, 1 / numWeeks)

  return rate
}

function calculateMonthOverMonthChange(weeklyPoints: WeeklyWeightPoint[]): number | null {
  if (weeklyPoints.length < 8) return null

  const thisMonthWeeks = weeklyPoints.slice(-4)
  const lastMonthWeeks = weeklyPoints.slice(-8, -4)

  const thisMonthRate = estimateWeeklyRateFromTrend(thisMonthWeeks)
  const lastMonthRate = estimateWeeklyRateFromTrend(lastMonthWeeks)

  return Math.round((thisMonthRate - lastMonthRate) * 10000) / 100
}

export function projectWeightTarget(params: {
  currentWeight: number
  targetWeight: number
  weeklyPoints: WeeklyWeightPoint[]
}): WeightProjectionResult {
  const { currentWeight, targetWeight, weeklyPoints } = params
  const usePercentageMethod = hasEnoughDataForPercentageMethod(weeklyPoints)

  const totalLossNeeded = currentWeight - targetWeight

  if (totalLossNeeded <= 0) {
    return {
      method: usePercentageMethod ? 'percentage' : 'fixed_kg',
      weeklyRatePercent: 0,
      weeklyLossKgAtStart: 0,
      weeksNeeded: 0,
      projectedDate: new Date().toISOString().slice(0, 10),
      isStalled: false,
      monthOverMonthRateChange: null,
    }
  }

  let weeklyRate: number
  let weeksNeeded: number
  let weeklyLossKgAtStart: number

  if (usePercentageMethod) {
    weeklyRate = estimateWeeklyRateFromTrend(weeklyPoints)
    weeklyLossKgAtStart = Math.round(currentWeight * weeklyRate * 10) / 10

    let simulatedWeight = currentWeight
    weeksNeeded = 0
    while (simulatedWeight > targetWeight && weeksNeeded < 200) {
      simulatedWeight -= simulatedWeight * weeklyRate
      weeksNeeded++
    }
  } else {
    weeklyRate = DEFAULT_FIXED_RATE
    weeklyLossKgAtStart = Math.round(currentWeight * weeklyRate * 10) / 10
    weeksNeeded = weeklyLossKgAtStart > 0 ? Math.ceil(totalLossNeeded / weeklyLossKgAtStart) : 0
  }

  const projectedDate = new Date()
  projectedDate.setUTCDate(projectedDate.getUTCDate() + weeksNeeded * 7)

  const monthOverMonthRateChange = calculateMonthOverMonthChange(weeklyPoints)
  const isStalled = weeklyRate < MIN_HEALTHY_RATE || (monthOverMonthRateChange !== null && monthOverMonthRateChange < 0 && weeklyRate < MIN_HEALTHY_RATE)

  return {
    method: usePercentageMethod ? 'percentage' : 'fixed_kg',
    weeklyRatePercent: Math.round(weeklyRate * 10000) / 100,
    weeklyLossKgAtStart,
    weeksNeeded,
    projectedDate: projectedDate.toISOString().slice(0, 10),
    isStalled,
    monthOverMonthRateChange,
  }
}

export interface BreakthroughStrategy {
  scenario: string
  action: string
}

export const breakthroughStrategies: BreakthroughStrategy[] = [
  { scenario: '速度<0.25%但仍緩降', action: '重新計算目前體重的TDEE，通常要往下修正' },
  { scenario: '連續2-4週完全不動', action: '增加蛋白質攝取＋阻力訓練，避免只靠有氧' },
  { scenario: '長期低碳飲食導致停滯', action: '安排每週1-2天Refeed Day微增碳水，刺激代謝' },
  { scenario: '體重不明原因上升', action: '先排除水腫/生理期因素，觀察2週趨勢再決定要不要調整' },
  { scenario: '壓力大、睡眠差', action: '優先處理壓力荷爾蒙與睡眠，這比多節食更關鍵' },
]
