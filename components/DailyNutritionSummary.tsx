'use client'

// 每日飲食摘要卡片：顯示所選日期的熱量、三大營養素與飲水量。
// 個人目標資料由 useProfile() 透過 SWR 共用快取取得。
// 飲水資料與最近體重由 DietRecordList 查詢後以 props 傳入。
//
// 顏色規則（隊長指定）：
// 熱量／三大營養素 → 單一目標值 ±5% 容許範圍
//   不足目標 → amber，超標 → red，範圍內 → green
// 飲水量 → 依最近一次體重紀錄動態算「範圍」（體重*30 ~ 體重*40 mL）
//   低於下限 → amber（未達標），高於上限 → red（超標），
//   落在範圍內 → green（達標）
//
// 版面：第一排放熱量＋飲水量（兩個「總量型」指標），第二排放三大營養素

import { useProfile } from '@/lib/hooks/useNotionData'

interface DailyNutritionSummaryProps {
  records: any[]
  waterIntakeMl: number | null
  isWaterLoading?: boolean
  latestWeightKg: number | null
  isWeightLoading?: boolean
}

const CALORIES_PER_GRAM = { protein: 4, fat: 9, carb: 4 }
const TOLERANCE = 0.05 // ±5% 視為達標，避免小數點誤差就跳警示色

const WATER_ML_PER_KG_MIN = 30
const WATER_ML_PER_KG_MAX = 40

// 三大營養素目標比例文字格式固定是 "蛋白質/脂質/碳水" 例如 "20/25/55"
function parseMacroRatio(ratioText: string | undefined): { protein: number; fat: number; carb: number } | null {
  if (!ratioText) return null
  const parts = ratioText.split('/').map((p) => Number(p.trim()))
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null
  return { protein: parts[0], fat: parts[1], carb: parts[2] }
}

function getStatusColor(consumed: number, target: number): { barColor: string; textColor: string; label: string } {
  if (!target || target <= 0) {
    return { barColor: 'bg-gray-300', textColor: 'text-gray-400', label: '—' }
  }
  const ratio = consumed / target
  if (ratio > 1 + TOLERANCE) {
    return { barColor: 'bg-red-500', textColor: 'text-red-600', label: '超標' }
  }
  if (ratio < 1 - TOLERANCE) {
    return { barColor: 'bg-amber-400', textColor: 'text-amber-600', label: '未達標' }
  }
  return { barColor: 'bg-green-500', textColor: 'text-green-600', label: '達標' }
}

// 飲水量目標是「範圍」而不是單一數字，所以顏色規則跟 getStatusColor() 不同：
// 低於下限（體重*30）→ amber；高於上限（體重*40）→ red；落在範圍內 → green。
// 沒有體重資料時無法算目標，回傳灰色 + 空值，UI 顯示「—」。
function getWaterStatus(consumedMl: number, weightKg: number | null) {
  if (!weightKg || weightKg <= 0) {
    return {
      barColor: 'bg-gray-300',
      textColor: 'text-gray-400',
      label: '—',
      targetMin: null as number | null,
      targetMax: null as number | null,
    }
  }

  const targetMin = weightKg * WATER_ML_PER_KG_MIN
  const targetMax = weightKg * WATER_ML_PER_KG_MAX

  if (consumedMl > targetMax) {
    return { barColor: 'bg-red-500', textColor: 'text-red-600', label: '超標', targetMin, targetMax }
  }
  if (consumedMl < targetMin) {
    return { barColor: 'bg-amber-400', textColor: 'text-amber-600', label: '未達標', targetMin, targetMax }
  }
  return { barColor: 'bg-green-500', textColor: 'text-green-600', label: '達標', targetMin, targetMax }
}

function MetricBar({ label, unit, consumed, target }: { label: string; unit: string; consumed: number; target: number }) {
  const { barColor, textColor, label: statusLabel } = getStatusColor(consumed, target)
  const percent = target > 0 ? Math.min((consumed / target) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-gray-600">{label}</span>
        <span className={`text-xs font-medium ${textColor}`}>{statusLabel}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold">{Math.round(consumed)}</span>
        <span className="text-xs text-gray-400">/ {target > 0 ? Math.round(target) : '—'} {unit}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function WaterMetric({
  waterIntakeMl,
  isWaterLoading,
  latestWeightKg,
  isWeightLoading,
}: {
  waterIntakeMl: number | null
  isWaterLoading: boolean
  latestWeightKg: number | null
  isWeightLoading: boolean
}) {
  const isLoading = isWaterLoading || isWeightLoading
  const consumed = waterIntakeMl ?? 0

  const { barColor, textColor, label, targetMin, targetMax } = getWaterStatus(consumed, latestWeightKg)

  // 進度條以上限（體重*40）為 100% 基準；超過上限時仍鎖在 100%，靠顏色變紅來表達「超標」，
  // 而不是讓長度失控延伸出容器。
  const percent = targetMax && targetMax > 0
    ? Math.min((consumed / targetMax) * 100, 100)
    : 0

  const targetText = targetMin && targetMax
    ? `${Math.round(targetMin)}~${Math.round(targetMax)}`
    : '—'

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-gray-600">飲水量</span>
        <span className={`text-xs font-medium ${textColor}`}>
          {isLoading ? '讀取中' : label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold">
          {isLoading || waterIntakeMl === null ? '—' : Math.round(waterIntakeMl)}
        </span>
        <span className="text-xs text-gray-400">/ {targetText}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export default function DailyNutritionSummary({
  records,
  waterIntakeMl,
  isWaterLoading = false,
  latestWeightKg,
  isWeightLoading = false,
}: DailyNutritionSummaryProps) {
  const { profile } = useProfile()

  const consumedCalories = records.reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const consumedProtein = records.reduce((sum, r) => sum + (Number(r.protein) || 0), 0)
  const consumedFat = records.reduce((sum, r) => sum + (Number(r.fat) || 0), 0)
  const consumedCarb = records.reduce((sum, r) => sum + (Number(r.carb) || 0), 0)

  const calorieTarget = Number(profile?.calorieTarget) || 0
  const macroRatio = parseMacroRatio(profile?.macroRatioTarget)

  const proteinTarget = macroRatio && calorieTarget
    ? (calorieTarget * macroRatio.protein / 100) / CALORIES_PER_GRAM.protein
    : 0
  const fatTarget = macroRatio && calorieTarget
    ? (calorieTarget * macroRatio.fat / 100) / CALORIES_PER_GRAM.fat
    : 0
  const carbTarget = macroRatio && calorieTarget
    ? (calorieTarget * macroRatio.carb / 100) / CALORIES_PER_GRAM.carb
    : 0

  if (!calorieTarget) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 text-xs text-gray-400">
        尚未設定每日熱量目標，請先到「個人資料」填寫，才能顯示當日飲食摘要。
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-2 md:py-5">
      <h3 className="text-xs font-semibold text-gray-500 mb-2">當日飲食摘要</h3>

      <div className="space-y-2 md:space-y-4">
        {/* 第一排：熱量 + 飲水量，兩個「總量型」指標 */}
        <div className="grid grid-cols-2 gap-5">
          <MetricBar label="熱量" unit="kcal" consumed={consumedCalories} target={calorieTarget} />
          <WaterMetric
            waterIntakeMl={waterIntakeMl}
            isWaterLoading={isWaterLoading}
            latestWeightKg={latestWeightKg}
            isWeightLoading={isWeightLoading}
          />
        </div>

        {/* 第二排：三大營養素 */}
        <div className="grid grid-cols-3 gap-5">
          <MetricBar label="碳水" unit="g" consumed={consumedCarb} target={carbTarget} />
          <MetricBar label="蛋白質" unit="g" consumed={consumedProtein} target={proteinTarget} />
          <MetricBar label="脂質" unit="g" consumed={consumedFat} target={fatTarget} />
        </div>
      </div>
    </div>
  )
}