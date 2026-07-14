// 每日總覽儀表板：資料彙整邏輯（獨立成 lib，方便日後測試/複用）

import { toDateKey, toLabel, getDayKeyRange, getUserTimeZone } from '@/lib/date/timezone'

export interface DietRecordRaw {
  id: string
  createdTime: string // Notion page.created_time，可靠的 ISO 時間戳（記錄時間 title 只是顯示用文字，不適合拿來做日期排序）
  recordDate?: string | null // 使用者填寫的「記錄日期」真正Date欄位，補登過去日期時這個才是正確依據
  mealType?: string
  calories?: number
  protein?: number
  fat?: number
  carb?: number
  alcoholCalories?: number // 酒精熱量，已包含在 calories 總熱量內，獨立拿出來畫第四塊扇區/趨勢線
  sugarDrink?: number // 糖(份)，額外攝取，供長期趨勢追蹤
  caffeineServings?: number // 咖啡因(杯)，額外攝取，供長期趨勢追蹤（無熱量，純習慣追蹤用）
  wholeGrain?: number
  proteinFood?: number
  vegetable?: number
  fruit?: number
  dairy?: number
  oilNuts?: number
}

export interface DayBucket {
  date: string // yyyy-MM-dd
  label: string // MM/dd 顯示用
  totalCalories: number
  mealBreakdown: Record<string, number>
  sugarServings: number // 當日糖(份)加總
  alcoholCalories: number // 當日酒精熱量(kcal)加總
  caffeineServings: number // 當日咖啡因(杯)加總
}

const MEAL_TYPES = ['早餐', '午餐', '晚餐', '點心', '宵夜']

export const defaultSuggestedServings: Record<string, number> = {
  wholeGrain: 3,
  proteinFood: 4,
  vegetable: 4,
  fruit: 3,
  dairy: 1.5,
  oilNuts: 4,
}

export const foodCategoryLabels: Record<string, string> = {
  wholeGrain: '全穀雜糧',
  proteinFood: '豆魚蛋肉',
  vegetable: '蔬菜',
  fruit: '水果',
  dairy: '乳品',
  oilNuts: '油脂堅果',
}

// 依日期分桶、加總每日熱量與各項額外攝取。日期範圍與逐筆歸類，
// 皆依指定時區（預設偵測使用者所在時區）計算，避免UTC邊界導致凌晨記錄被歸到前一天。
export function bucketByDay(
  records: DietRecordRaw[],
  days: number,
  timeZone: string = getUserTimeZone()
): DayBucket[] {
  const buckets = new Map<string, DayBucket>()
  const keys = getDayKeyRange(days, timeZone)

  for (const key of keys) {
    buckets.set(key, {
      date: key,
      label: toLabel(key),
      totalCalories: 0,
      mealBreakdown: Object.fromEntries(MEAL_TYPES.map((m) => [m, 0])),
      sugarServings: 0,
      alcoholCalories: 0,
      caffeineServings: 0,
    })
  }

  for (const r of records) {
    const key = toDateKey(r.recordDate ?? r.createdTime, timeZone)
    const bucket = buckets.get(key)
    if (!bucket) continue
    const cal = r.calories ?? 0
    bucket.totalCalories += cal
    if (r.mealType && bucket.mealBreakdown[r.mealType] !== undefined) {
      bucket.mealBreakdown[r.mealType] += cal
    }
    bucket.sugarServings += r.sugarDrink ?? 0
    bucket.alcoholCalories += r.alcoholCalories ?? 0
    bucket.caffeineServings += r.caffeineServings ?? 0
  }

  return Array.from(buckets.values())
}

// 判斷選定範圍內糖/酒精/咖啡因是否全部為0，供儀表板決定要不要收合這個區塊
export function hasAnyExtraIntake(buckets: DayBucket[]): boolean {
  return buckets.some((b) => b.sugarServings > 0 || b.alcoholCalories > 0 || b.caffeineServings > 0)
}

export interface TodaySummary {
  totalCalories: number
  macros: { protein: number; fat: number; carb: number; alcoholCalories: number }
  macroRatio: { protein: number; fat: number; carb: number; alcohol: number }
  sixCategory: Array<{ key: string; label: string; actual: number; suggested: number }>
}

// 統計「今天」的營養攝取彙總。"今天"的判定與逐筆歸類，皆依指定時區
// （預設偵測使用者所在時區）計算，避免凌晨記錄的一餐被UTC邊界誤判成不屬於今天。
export function summarizeToday(
  records: DietRecordRaw[],
  timeZone: string = getUserTimeZone()
): TodaySummary {
  const todayKey = toDateKey(new Date(), timeZone)
  const todayRecords = records.filter((r) => toDateKey(r.recordDate ?? r.createdTime, timeZone) === todayKey)
  let totalCalories = 0
  let protein = 0
  let fat = 0
  let carb = 0
  let alcoholCalories = 0
  const categoryTotals: Record<string, number> = {
    wholeGrain: 0, proteinFood: 0, vegetable: 0, fruit: 0, dairy: 0, oilNuts: 0,
  }

  for (const r of todayRecords) {
    totalCalories += r.calories ?? 0
    protein += r.protein ?? 0
    fat += r.fat ?? 0
    carb += r.carb ?? 0
    alcoholCalories += r.alcoholCalories ?? 0
    for (const key of Object.keys(categoryTotals)) {
      categoryTotals[key] += (r as any)[key] ?? 0
    }
  }

  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const carbKcal = carb * 4
  const kcalSum = proteinKcal + fatKcal + carbKcal + alcoholCalories

  const macroRatio = kcalSum > 0
    ? {
        protein: Math.round((proteinKcal / kcalSum) * 100),
        fat: Math.round((fatKcal / kcalSum) * 100),
        carb: Math.round((carbKcal / kcalSum) * 100),
        alcohol: Math.round((alcoholCalories / kcalSum) * 100),
      }
    : { protein: 0, fat: 0, carb: 0, alcohol: 0 }

  const sixCategory = Object.entries(categoryTotals).map(([key, actual]) => ({
    key,
    label: foodCategoryLabels[key],
    actual: Math.round(actual * 10) / 10,
    suggested: defaultSuggestedServings[key],
  }))

  return {
    totalCalories: Math.round(totalCalories),
    macros: {
      protein: Math.round(protein * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      carb: Math.round(carb * 10) / 10,
      alcoholCalories: Math.round(alcoholCalories),
    },
    macroRatio,
    sixCategory,
  }
}