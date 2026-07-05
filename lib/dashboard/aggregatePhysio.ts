// 趨勢分析儀表板：生理紀錄資料彙整邏輯

export interface PhysioRecordRaw {
  id: string
  createdTime: string
  weight?: number
  bodyFat?: number
  waist?: number
  hip?: number
}

export interface TrendPoint {
  date: string
  label: string
  weight?: number
  bodyFat?: number
  waist?: number
  waistHipRatio?: number
  bmi?: number
  weightMA7?: number // 7日移動平均
}

function toDateKey(isoString: string): string {
  return new Date(isoString).toISOString().slice(0, 10)
}

function toLabel(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  return `${m}/${d}`
}

// 同一天若有多筆記錄，取當天最後一筆（最新量測結果）
function dedupeByDay(records: PhysioRecordRaw[]): Map<string, PhysioRecordRaw> {
  const sorted = [...records].sort((a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime())
  const map = new Map<string, PhysioRecordRaw>()
  for (const r of sorted) {
    map.set(toDateKey(r.createdTime), r)
  }
  return map
}

export function buildTrendPoints(records: PhysioRecordRaw[], heightCm: number | null): TrendPoint[] {
  const dailyMap = dedupeByDay(records)
  const sortedKeys = Array.from(dailyMap.keys()).sort()

  const points: TrendPoint[] = sortedKeys.map((key) => {
    const r = dailyMap.get(key)!
    const heightM = heightCm ? heightCm / 100 : null
    const bmi = r.weight && heightM ? Math.round((r.weight / (heightM * heightM)) * 10) / 10 : undefined
    const waistHipRatio = r.waist && r.hip ? Math.round((r.waist / r.hip) * 100) / 100 : undefined

    return {
      date: key,
      label: toLabel(key),
      weight: r.weight,
      bodyFat: r.bodyFat,
      waist: r.waist,
      waistHipRatio,
      bmi,
    }
  })

  // 計算體重7日移動平均（只用實際有數值的天數往前抓，不足7天則用現有天數平均）
  for (let i = 0; i < points.length; i++) {
    const windowStart = Math.max(0, i - 6)
    const window = points.slice(windowStart, i + 1).filter((p) => p.weight !== undefined)
    if (window.length > 0) {
      const sum = window.reduce((acc, p) => acc + (p.weight ?? 0), 0)
      points[i].weightMA7 = Math.round((sum / window.length) * 10) / 10
    }
  }

  return points
}

export function bmiZone(bmi: number): 'underweight' | 'normal' | 'overweight' | 'obese' {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 24) return 'normal'
  if (bmi < 27) return 'overweight'
  return 'obese'
}
