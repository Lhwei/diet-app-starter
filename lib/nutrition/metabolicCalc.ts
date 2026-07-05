// 個人資料自動計算邏輯：BMR（基礎代謝率）、TDEE（每日總消耗）、BMI

// 活動係數字串（如 "久坐1.2"）解析出數值 1.2
export function parseActivityFactor(value: string | undefined): number | null {
  if (!value) return null
  const match = value.match(/([\d.]+)$/)
  return match ? parseFloat(match[1]) : null
}

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--
  return age
}

// Mifflin-St Jeor 公式：男性 BMR = 10×體重 + 6.25×身高 - 5×年齡 + 5
//                      女性 BMR = 10×體重 + 6.25×身高 - 5×年齡 - 161
export function calculateBmr(params: {
  gender?: string
  weightKg?: number
  heightCm?: number
  birthDate?: string
}): number | null {
  const { gender, weightKg, heightCm, birthDate } = params
  if (!weightKg || !heightCm || !birthDate) return null

  const age = calculateAge(birthDate)
  if (age === null) return null

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  const bmr = gender === '男' ? base + 5 : gender === '女' ? base - 161 : base - 78 // 其他性別取平均值

  return Math.round(bmr)
}

export function calculateTdee(bmr: number | null, activityFactorLabel?: string): number | null {
  if (bmr === null) return null
  const factor = parseActivityFactor(activityFactorLabel)
  if (factor === null) return null
  return Math.round(bmr * factor)
}

export function calculateBmi(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

// 若使用者沒有手動填每日熱量目標，依「目標模式」自動建議：
// 減脂控卡 → TDEE - 500（每週約減0.5kg的安全赤字）
// 日常維持 → TDEE
// 血糖控制 → TDEE - 200（溫和赤字，避免血糖劇烈波動）
export function suggestCalorieTarget(tdee: number | null, targetMode?: string): number | null {
  if (tdee === null) return null
  if (targetMode === '減脂控卡') return Math.max(tdee - 500, 1200)
  if (targetMode === '血糖控制') return Math.max(tdee - 200, 1200)
  return tdee
}

// 每日飲水目標建議範圍：體重(kg) × 30 ~ 體重(kg) × 40（常見飲水量建議公式）
// 回傳中位數作為預設寫入值，同時保留上下限供UI顯示參考範圍
export function calculateWaterTargetRange(weightKg?: number): { min: number; max: number; suggested: number } | null {
  if (!weightKg) return null
  const min = Math.round(weightKg * 30)
  const max = Math.round(weightKg * 40)
  const suggested = Math.round((min + max) / 2)
  return { min, max, suggested }
}
