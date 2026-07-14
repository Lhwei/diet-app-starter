// 趨勢分析儀表板：生理紀錄資料彙整邏輯

import { toDateKey, toLabel, getDayKeyRange, getUserTimeZone } from '@/lib/date/timezone'

export interface PhysioRecordRaw {
  id: string
  createdTime: string // Notion page.created_time，僅作為recordDate缺失時的備用排序依據
  recordDate?: string | null // 使用者填寫的「記錄日期」（Title欄位存文字），補登過去日期時這個才是正確依據
  weight?: number
  bodyFat?: number
  waist?: number
  hip?: number
  waterIntake?: number // 飲水量(ml)，單次紀錄；同一天會有多筆需要加總（跟weight取「當天最後一筆」不同）
  toiletType?: '尿尿' | '大便' | null // 如廁類型；同一天會有多筆需要分類計數
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

// 每日健康行為彙整：飲水量加總、如廁分類計數。跟「體位量測」性質不同，
// 體位是「當天最後一次量測值」，飲水/如廁則是「一整天所有事件的加總/計數」，
// 因此獨立於buildTrendPoints之外，另外用bucketByDay式的邏輯處理。
export interface HealthBehaviorBucket {
  date: string
  label: string
  waterIntake: number // 當天飲水量加總(ml)
  peeCount: number // 當天尿尿次數
  poopCount: number // 當天大便次數
}

// 記錄的日期依據：優先用使用者填的recordDate，缺失才退回createdTime，
// 避免補登過去日期的紀錄被誤判成「今天/當天建立」而算錯日期。
// 日期key一律依指定時區（預設偵測使用者所在時區）計算，避免UTC邊界導致跨日誤判。
function recordDateKey(r: PhysioRecordRaw, timeZone?: string): string {
  return toDateKey(r.recordDate || r.createdTime, timeZone)
}

// 同一天若有多筆體位量測記錄，取當天最後一筆（最新量測結果）
function dedupeByDay(records: PhysioRecordRaw[], timeZone?: string): Map<string, PhysioRecordRaw> {
  const sorted = [...records].sort(
    (a, b) => new Date(a.recordDate || a.createdTime).getTime() - new Date(b.recordDate || b.createdTime).getTime()
  )
  const map = new Map<string, PhysioRecordRaw>()
  for (const r of sorted) {
    map.set(recordDateKey(r, timeZone), r)
  }
  return map
}

export function buildTrendPoints(
  records: PhysioRecordRaw[],
  heightCm: number | null,
  timeZone: string = getUserTimeZone()
): TrendPoint[] {
  const dailyMap = dedupeByDay(records, timeZone)
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

// 依日期分桶，加總飲水量、分類計數如廁次數，補齊選定範圍內所有日期（即使當天沒紀錄也顯示0），
// 這樣折線圖/長條圖的X軸日期範圍才會完整，不會因為某天沒紀錄就整天消失不見。
// 日期範圍與逐筆歸類，皆依指定時區（預設偵測使用者所在時區）計算，避免UTC邊界導致跨日誤判。
export function bucketHealthBehaviorByDay(
  records: PhysioRecordRaw[],
  days: number,
  timeZone: string = getUserTimeZone()
): HealthBehaviorBucket[] {
  const buckets = new Map<string, HealthBehaviorBucket>()
  const keys = getDayKeyRange(days, timeZone)

  for (const key of keys) {
    buckets.set(key, { date: key, label: toLabel(key), waterIntake: 0, peeCount: 0, poopCount: 0 })
  }

  for (const r of records) {
    const key = recordDateKey(r, timeZone)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.waterIntake += r.waterIntake ?? 0
    if (r.toiletType === '尿尿') bucket.peeCount += 1
    if (r.toiletType === '大便') bucket.poopCount += 1
  }

  return Array.from(buckets.values())
}