// 台灣衛福部「食物代換表」六大類每份營養素基準值
// 來源：隊長提供的 file.csv（每份熱量/碳水/蛋白質/脂肪，"微量"視為 0）

export interface FoodExchangeUnit {
  calories: number // kcal
  carb: number // g
  protein: number // g
  fat: number // g
}

export const foodExchangeTable: Record<string, FoodExchangeUnit> = {
  wholeGrain: { calories: 70, carb: 15, protein: 2, fat: 0 },
  proteinFood: { calories: 75, carb: 0, protein: 7, fat: 5 },
  dairy: { calories: 120, carb: 12, protein: 8, fat: 4 },
  vegetable: { calories: 25, carb: 5, protein: 1, fat: 0 },
  fruit: { calories: 60, carb: 15, protein: 0, fat: 0 },
  oilNuts: { calories: 45, carb: 0, protein: 0, fat: 5 },
}

// 六大類食物的表單 key（對應 dietFieldsConfig.ts 裡的 key）
export const foodCategoryKeys = Object.keys(foodExchangeTable) as Array<keyof typeof foodExchangeTable>

export interface CalculatedNutrition {
  calories: number
  protein: number
  fat: number
  carb: number
  ratioText: string // 例如 "20/30/50"（蛋白質/脂質/碳水熱量佔比）
}

// 根據六大類食物份數，計算總熱量、三大營養素克數與熱量佔比
export function calculateNutritionFromServings(
  servings: Partial<Record<keyof typeof foodExchangeTable, number | string>>
): CalculatedNutrition {
  let totalCalories = 0
  let totalCarb = 0
  let totalProtein = 0
  let totalFat = 0

  for (const key of foodCategoryKeys) {
    const raw = servings[key]
    const count = raw === undefined || raw === null || raw === '' ? 0 : Number(raw)
    if (Number.isNaN(count) || count <= 0) continue

    const unit = foodExchangeTable[key]
    totalCalories += unit.calories * count
    totalCarb += unit.carb * count
    totalProtein += unit.protein * count
    totalFat += unit.fat * count
  }

  // 蛋白質、脂質熱量：每克 4 大卡 / 9 大卡；碳水每克 4 大卡
  const proteinKcal = totalProtein * 4
  const fatKcal = totalFat * 9
  const carbKcal = totalCarb * 4
  const kcalSum = proteinKcal + fatKcal + carbKcal

  const ratioText =
    kcalSum > 0
      ? `${Math.round((proteinKcal / kcalSum) * 100)}/${Math.round((fatKcal / kcalSum) * 100)}/${Math.round((carbKcal / kcalSum) * 100)}`
      : ''

  return {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    carb: Math.round(totalCarb * 10) / 10,
    ratioText,
  }
}
