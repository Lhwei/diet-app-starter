// 每日總覽儀表板：資料彙整邏輯（獨立成 lib，方便日後測試/複用）

export interface DietRecordRaw {
  id: string
  createdTime: string // Notion page.created_time，可靠的 ISO 時間戳（記錄時間 title 只是顯示用文字，不適合拿來做日期排序）
  recordDate?: string | null // 使用者填寫的「記錄日期」真正Date欄位，補登過去日期時這個才是正確依據
  mealType?: string
  calories?: number
  protein?: number
  fat?: number
  carb?: number
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
}

const MEAL_TYPES = ['早餐', '午餐', '晚餐', '點心', '宵夜']

// 六大類建議份數的預設基準（依 1600kcal 減脂控卡飲食常見建議估算）
// 註：個人資料目前沒有自訂建議份數欄位（隊長已確認刪除 JSON 欄位），此為暫用預設值，
// 之後若要做成可自訂，需在個人資料資料庫新增對應 Number 欄位
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

function toDateKey(isoString: string): string {
  const d = new Date(isoString)
  return d.toISOString().slice(0, 10) // yyyy-MM-dd（用 UTC 簡化處理，避免時區判斷複雜度）
}

function toLabel(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  return `${m}/${d}`
}

// 依日期分桶，計算每日總熱量與各餐別熱量疊層（供折線圖 + 堆疊長條圖使用）
export function bucketByDay(records: DietRecordRaw[], days: number): DayBucket[] {
  const buckets = new Map<string, DayBucket>()

  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, {
      date: key,
      label: toLabel(key),
      totalCalories: 0,
      mealBreakdown: Object.fromEntries(MEAL_TYPES.map((m) => [m, 0])),
    })
  }

  for (const r of records) {
    const key = toDateKey(r.recordDate ?? r.createdTime)   // 優先用 recordDate，沒有才退回 createdTime
    const bucket = buckets.get(key)
    if (!bucket) continue // 超出範圍的紀錄不列入
    const cal = r.calories ?? 0
    bucket.totalCalories += cal
    if (r.mealType && bucket.mealBreakdown[r.mealType] !== undefined) {
      bucket.mealBreakdown[r.mealType] += cal
    }
  }

  return Array.from(buckets.values())
}

export interface TodaySummary {
  totalCalories: number
  macros: { protein: number; fat: number; carb: number }
  macroRatio: { protein: number; fat: number; carb: number } // 熱量佔比 %
  sixCategory: Array<{ key: string; label: string; actual: number; suggested: number }>
}

export function summarizeToday(records: DietRecordRaw[]): TodaySummary {
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayRecords = records.filter((r) => toDateKey(r.recordDate ?? r.createdTime) === todayKey)
  let totalCalories = 0
  let protein = 0
  let fat = 0
  let carb = 0
  const categoryTotals: Record<string, number> = {
    wholeGrain: 0, proteinFood: 0, vegetable: 0, fruit: 0, dairy: 0, oilNuts: 0,
  }

  for (const r of todayRecords) {
    totalCalories += r.calories ?? 0
    protein += r.protein ?? 0
    fat += r.fat ?? 0
    carb += r.carb ?? 0
    for (const key of Object.keys(categoryTotals)) {
      categoryTotals[key] += (r as any)[key] ?? 0
    }
  }

  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const carbKcal = carb * 4
  const kcalSum = proteinKcal + fatKcal + carbKcal

  const macroRatio = kcalSum > 0
    ? {
        protein: Math.round((proteinKcal / kcalSum) * 100),
        fat: Math.round((fatKcal / kcalSum) * 100),
        carb: Math.round((carbKcal / kcalSum) * 100),
      }
    : { protein: 0, fat: 0, carb: 0 }

  const sixCategory = Object.entries(categoryTotals).map(([key, actual]) => ({
    key,
    label: foodCategoryLabels[key],
    actual: Math.round(actual * 10) / 10,
    suggested: defaultSuggestedServings[key],
  }))

  return {
    totalCalories: Math.round(totalCalories),
    macros: { protein: Math.round(protein * 10) / 10, fat: Math.round(fat * 10) / 10, carb: Math.round(carb * 10) / 10 },
    macroRatio,
    sixCategory,
  }
}
