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

// 糖（含糖飲料/甜點）換算基準：比照水果類的碳水單位定義，1份=15g碳水=60大卡，
// 不含蛋白質/脂質（單純糖類的熱量來源只有碳水）
export const SUGAR_SERVING = { calories: 60, carb: 15 }

// 酒類ABV%對照表（估算值，供熱量換算使用，非精確醫學數據）
// 使用者填「飲用量(ml)」= 喝下去的酒飲總量（例如一杯啤酒350ml），而非純酒精量，
// 程式依酒類自動帶入濃度換算，使用者不需要自己計算酒精濃度
export const ALCOHOL_ABV: Record<string, number> = {
  '啤酒': 5,
  '紅酒': 12,
  '白酒/清酒': 15,
  '烈酒': 40,
  '其他': 10,
}
export const alcoholTypeOptions = Object.keys(ALCOHOL_ABV)

// 酒精熱量公式：飲用量(ml) × 酒精濃度% × 0.8(酒精密度g/ml) × 7大卡/g酒精
// 酒精是純熱量來源，不計入蛋白質/脂質/碳水任何一項，因此獨立回傳，不併入三大營養素比例計算
export function calculateAlcoholCalories(ml: number, type: string | undefined): number {
  if (!ml || ml <= 0) return 0
  const abv = ALCOHOL_ABV[type ?? '其他'] ?? ALCOHOL_ABV['其他']
  const grams = ml * (abv / 100) * 0.8
  return Math.round(grams * 7)
}

// 原本的六大類份數計算，維持不變（供表單即時顯示六大類小計等場景沿用）
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

// 完整版計算：六大類 + 糖 + 酒精，統一在這裡計算後寫入表單/Notion，
// 這是 DietRecordForm.tsx 送出表單時應該呼叫的函式（取代單純呼叫 calculateNutritionFromServings）。
//
// 熱量(calories)：六大類 + 糖 + 酒精 全部計入，用於「本日熱量缺口」等總熱量相關計算
// 三大營養素比例(ratioText)：只算蛋白質/脂質/碳水（酒精不是巨量營養素，不放進這個比例），
//   碳水化合物本身有把糖的碳水量算進去（糖本來就是碳水的一種來源）
// alcoholCalories：獨立回傳，供儀表板畫第四塊「酒精」扇區使用，需要另外存進Notion欄位
export function calculateFullDietNutrition(values: Record<string, any>) {
  const servings: Record<string, number> = {}
  for (const group of foodGroupNutrition) {
    servings[group.key] = Number(values[group.key]) || 0
  }
  const base = calculateNutritionFromServings(servings)

  const sugarServings = Number(values.sugarDrink) || 0
  const sugarCalories = sugarServings * SUGAR_SERVING.calories
  const sugarCarb = sugarServings * SUGAR_SERVING.carb

  const alcoholMl = Number(values.alcohol) || 0
  const alcoholCalories = calculateAlcoholCalories(alcoholMl, values.alcoholType)

  const protein = base.protein
  const fat = base.fat
  const carb = Math.round((base.carb + sugarCarb) * 10) / 10
  const calories = Math.round(base.calories + sugarCalories + alcoholCalories)

  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const carbKcal = carb * 4
  const macroKcalSum = proteinKcal + fatKcal + carbKcal

  const ratioText = macroKcalSum > 0
    ? `${Math.round((proteinKcal / macroKcalSum) * 100)}% / ${Math.round((fatKcal / macroKcalSum) * 100)}% / ${Math.round((carbKcal / macroKcalSum) * 100)}%`
    : ''

  return { calories, protein, fat, carb, ratioText, alcoholCalories }
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
