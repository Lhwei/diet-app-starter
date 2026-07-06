// 六大類食物「每份」營養素基準值（衛福部每日飲食指南通用版本）
// 用於根據使用者輸入的份數，自動加總計算蛋白質/脂質/碳水/熱量
export interface FoodGroupNutrition {
  key: string
  label: string
  calories: number
  protein: number
  fat: number
  carb: number
}

export const foodGroupNutrition: FoodGroupNutrition[] = [
  { key: 'wholeGrain', label: '全穀雜糧類', calories: 70, protein: 2, fat: 0, carb: 15 },
  { key: 'proteinFood', label: '豆魚蛋肉類', calories: 75, protein: 7, fat: 5, carb: 0 },
  { key: 'vegetable', label: '蔬菜類', calories: 25, protein: 1, fat: 0, carb: 5 },
  { key: 'fruit', label: '水果類', calories: 60, protein: 0, fat: 0, carb: 15 },
  { key: 'dairy', label: '乳品類', calories: 120, protein: 8, fat: 4, carb: 12 },
  { key: 'oilNuts', label: '油脂與堅果種子類', calories: 45, protein: 0, fat: 5, carb: 0 },
]

export function calculateNutritionFromServings(servings: Record<string, number>) {
  let calories = 0
  let protein = 0
  let fat = 0
  let carb = 0

  for (const group of foodGroupNutrition) {
    const n = Number(servings[group.key]) || 0
    calories += n * group.calories
    protein += n * group.protein
    fat += n * group.fat
    carb += n * group.carb
  }

  calories = Math.round(calories)
  protein = Math.round(protein * 10) / 10
  fat = Math.round(fat * 10) / 10
  carb = Math.round(carb * 10) / 10

  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const carbKcal = carb * 4
  const totalKcal = proteinKcal + fatKcal + carbKcal

  const ratioText = totalKcal > 0
    ? `${Math.round((proteinKcal / totalKcal) * 100)}% / ${Math.round((fatKcal / totalKcal) * 100)}% / ${Math.round((carbKcal / totalKcal) * 100)}%`
    : ''

  return { calories, protein, fat, carb, ratioText }
}

// 依目前時間自動判斷餐別，使用者仍可在表單上手動覆蓋
export function suggestMealTypeByTime(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 10) return '早餐'
  if (hour >= 10 && hour < 14) return '午餐'
  if (hour >= 14 && hour < 17) return '點心'
  if (hour >= 17 && hour < 21) return '晚餐'
  return '宵夜' // 21:00–04:59
}
