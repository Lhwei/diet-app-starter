'use client'

import { useEffect, useState } from 'react'
import { MacroRatio, dietModeMacroPresets, getPresetForDietMode, parseMacroRatioText, formatMacroRatioText } from '@/lib/nutrition/macroRatioPresets'

interface Props {
  dietMode?: string
  value: string | null // "20/30/50" 格式的文字，跟表單其他欄位一致
  onChange: (text: string) => void
}

const LABELS: Array<{ key: keyof MacroRatio; label: string; color: string }> = [
  { key: 'protein', label: '蛋白質', color: '#3b82f6' },
  { key: 'fat', label: '脂質', color: '#f59e0b' },
  { key: 'carb', label: '碳水化合物', color: '#10b981' },
]

// 三個滑桿必須維持總和100%的調整邏輯：
// 拖動某一項時，把變化量依「另外兩項目前的比例權重」分攤扣減/加回去，
// 這樣調整蛋白質不會讓脂質或碳水變成負數，也能保持整體感覺自然（原本佔比越高的項目，被分攤到的變動量也越大）
function adjustRatio(current: MacroRatio, changedKey: keyof MacroRatio, newValue: number): MacroRatio {
  const clamped = Math.max(0, Math.min(100, newValue))
  const delta = clamped - current[changedKey]

  const otherKeys = LABELS.map((l) => l.key).filter((k) => k !== changedKey)
  const otherSum = otherKeys.reduce((sum, k) => sum + current[k], 0)

  const next = { ...current, [changedKey]: clamped }

  if (otherSum <= 0) {
    // 另外兩項都是0時，平均分攤負的delta
    const share = -delta / otherKeys.length
    otherKeys.forEach((k) => { next[k] = Math.max(0, Math.round(share)) })
  } else {
    otherKeys.forEach((k) => {
      const weight = current[k] / otherSum
      next[k] = Math.max(0, Math.round(current[k] - delta * weight))
    })
  }

  // 四捨五入後可能總和不是剛好100，用最大的那一項吸收誤差，確保永遠等於100
  const total = next.protein + next.fat + next.carb
  const diff = 100 - total
  if (diff !== 0) {
    const largestKey = LABELS.map((l) => l.key).reduce((a, b) => (next[a] >= next[b] ? a : b))
    next[largestKey] += diff
  }

  return next
}

export default function MacroRatioSlider({ dietMode, value, onChange }: Props) {
  const [ratio, setRatio] = useState<MacroRatio>(() => parseMacroRatioText(value) ?? getPresetForDietMode(dietMode))
  const [userAdjusted, setUserAdjusted] = useState(false)

  // 飲食模式變更時，若使用者還沒手動調整過比例，自動套用對應飲食模式的預設比例
  useEffect(() => {
    if (!userAdjusted) {
      const preset = getPresetForDietMode(dietMode)
      setRatio(preset)
      onChange(formatMacroRatioText(preset))
    }
  }, [dietMode])

  function handleSliderChange(key: keyof MacroRatio, newValue: number) {
    const next = adjustRatio(ratio, key, newValue)
    setRatio(next)
    setUserAdjusted(true)
    onChange(formatMacroRatioText(next))
  }

  function applyPreset(presetRatio: MacroRatio) {
    setRatio(presetRatio)
    setUserAdjusted(true)
    onChange(formatMacroRatioText(presetRatio))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(dietModeMacroPresets).map(([mode, preset]) => (
          <button
            type="button"
            key={mode}
            onClick={() => applyPreset(preset)}
            className={`text-xs rounded-full px-3 py-1 border transition ${
              ratio.protein === preset.protein && ratio.fat === preset.fat && ratio.carb === preset.carb
                ? 'bg-black text-white border-black'
                : 'border-border text-text-muted hover:border-border'
            }`}
          >
            {mode} {formatMacroRatioText(preset)}
          </button>
        ))}
      </div>

      <div className="flex h-3 rounded-full overflow-hidden">
        {LABELS.map((l) => (
          <div key={l.key} style={{ width: `${ratio[l.key]}%`, backgroundColor: l.color }} className="transition-all" />
        ))}
      </div>

      <div className="space-y-3">
        {LABELS.map((l) => (
          <div key={l.key} className="flex items-center gap-3">
            <span className="text-sm text-text-muted w-20 shrink-0">{l.label}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={ratio[l.key]}
              onChange={(e) => handleSliderChange(l.key, Number(e.target.value))}
              className="flex-1 accent-current"
              style={{ color: l.color }}
            />
            <span className="text-sm font-medium w-12 text-right" style={{ color: l.color }}>{ratio[l.key]}%</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-subtle">
        目前比例：{formatMacroRatioText(ratio)}（蛋白質/脂質/碳水），拖動任一滑桿會自動調整另外兩項，總和維持100%
      </p>
    </div>
  )
}
