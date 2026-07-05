'use client'

interface Props {
  consumed: number
  target: number
}

export default function CalorieGauge({ consumed, target }: Props) {
  const percent = target > 0 ? Math.min((consumed / target) * 100, 130) : 0
  const remaining = target - consumed
  const isOver = remaining < 0

  const barColor = percent > 110 ? '#ef4444' : percent > 90 ? '#f59e0b' : '#10b981'

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="font-semibold mb-4">本日熱量缺口</h3>
      <div className="flex items-end justify-between mb-2">
        <span className="text-3xl font-bold">{Math.round(consumed)}</span>
        <span className="text-sm text-gray-400">/ {target} kcal</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: barColor }}
        />
      </div>
      <p className={`text-sm mt-3 ${isOver ? 'text-red-500' : 'text-gray-500'}`}>
        {isOver ? `已超標 ${Math.abs(Math.round(remaining))} kcal` : `剩餘額度 ${Math.round(remaining)} kcal`}
      </p>
    </div>
  )
}
