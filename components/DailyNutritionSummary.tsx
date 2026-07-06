'use client'

// 每日飲食摘要卡片：顯示「今天已吃 vs 目標」的熱量、碳水、蛋白質、脂質
// 目標值來自個人資料（每日熱量目標 + 三大營養素目標比例），已吃的量是把當天所有飲食紀錄加總
//
// 顏色規則（隊長指定）：
// 不足目標 → 警示顏色A（amber，偏黃橙色，代表「還沒吃夠」）
// 超過目標 → 警示顏色B（red，代表「吃太多了」）
// 在目標±5%容許範圍內 → 綠色（正常/達標）

import { useProfile } from '@/lib/hooks/useNotionData'

interface DailyNutritionSummaryProps {
  records: any[]
}

const CALORIES_PER_GRAM = { protein: 4, fat: 9, carb: 4 }
const TOLERANCE = 0.05 // ±5% 視為達標，避免小數點誤差就跳警示色

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
    return { barColor: 'bg-red-500', textColor: 'text-red-600', label: '超過目標' }
  }
  if (ratio < 1 - TOLERANCE) {
    return { barColor: 'bg-amber-400', textColor: 'text-amber-600', label: '尚未達標' }
  }
  return { barColor: 'bg-green-500', textColor: 'text-green-600', label: '達標' }
}

function MetricBar({ label, unit, consumed, target }: { label: string; unit: string; consumed: number; target: number }) {
  const { barColor, textColor, label: statusLabel } = getStatusColor(consumed, target)
  const percent = target > 0 ? Math.min((consumed / target) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`text-xs font-medium ${textColor}`}>{statusLabel}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold">{Math.round(consumed)}</span>
        <span className="text-sm text-gray-400">/ {target > 0 ? Math.round(target) : '—'} {unit}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export default function DailyNutritionSummary({ records }: DailyNutritionSummaryProps) {
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
      <div className="bg-white rounded-2xl shadow-sm p-5 text-sm text-gray-400">
        尚未設定每日熱量目標，請先到「個人資料」填寫，才能顯示今日飲食摘要。
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-500 mb-4">今日飲食摘要</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <MetricBar label="熱量" unit="kcal" consumed={consumedCalories} target={calorieTarget} />
        <MetricBar label="碳水化合物" unit="g" consumed={consumedCarb} target={carbTarget} />
        <MetricBar label="蛋白質" unit="g" consumed={consumedProtein} target={proteinTarget} />
        <MetricBar label="脂質" unit="g" consumed={consumedFat} target={fatTarget} />
      </div>
    </div>
  )
}
