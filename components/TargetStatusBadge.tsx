'use client'

interface Props {
  label: string
  current: number | null
  target: number | null
  unit?: string
  higherIsBetter?: boolean // true: 現況高於目標視為好方向（例如肌肉量），false: 低於目標視為好方向（例如體重/熱量）
  reverseColor?: boolean
}

// 顯示「目標 vs 現況」的小標籤，統一用在各圖表卡片右上角
export default function TargetStatusBadge({ label, current, target, unit = '', higherIsBetter = false }: Props) {
  if (target === null || current === null) {
    return (
      <span className="text-xs text-text-subtle bg-background rounded-full px-3 py-1">
        {label}：尚未設定目標
      </span>
    )
  }

  const diff = Math.round((current - target) * 10) / 10
  const isGood = higherIsBetter ? diff >= 0 : diff <= 0
  const diffText = diff === 0 ? '達標' : `${diff > 0 ? '+' : ''}${diff}${unit}`

  return (
    <span
      className={`text-xs rounded-full px-3 py-1 font-medium ${
        isGood ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
      }`}
    >
      {label} 目標{target}{unit} · 現況{current}{unit} ({diffText})
    </span>
  )
}
