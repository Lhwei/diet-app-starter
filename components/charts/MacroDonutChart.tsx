'use client'

// 今日三大營養素比例（甜甜圈圖）
//
// 本次異動：新增第四塊「酒精」扇區。酒精不是巨量營養素，不計入蛋白/脂/碳水的
// 目標比例基準(targetRatioText，例如「20/25/55」)，只是把它的熱量佔比額外疊加顯示，
// 讓使用者知道「今天喝的酒佔了多少熱量」，但不會誤導成蛋白/脂/碳水的比例被稀釋。
//
// 實作方式：純SVG手刻圓環（stroke-dasharray切割圓周），不依賴外部圖表函式庫，
// 保留原本專案一致的手刻圖表風格（同 CalorieGauge.tsx）。

interface Props {
  protein: number // g
  fat: number // g
  carb: number // g
  alcoholCalories?: number // kcal，選填，沒有喝酒或酒精熱量為0時不顯示
  targetRatioText?: string | null // 例如 "20/25/55"，只代表蛋白/脂/碳水的目標比例
}

const COLORS = {
  protein: '#3b82f6', // 藍
  fat: '#f59e0b', // 橙
  carb: '#10b981', // 綠
  alcohol: '#a855f7', // 紫，跟其他三色明顯區隔，避免使用者誤以為酒精是巨量營養素之一
}

const RADIUS = 70
const STROKE_WIDTH = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function MacroDonutChart({ protein, fat, carb, alcoholCalories = 0, targetRatioText }: Props) {
  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const carbKcal = carb * 4
  const alcoholKcal = Math.max(0, alcoholCalories)
  const totalKcal = proteinKcal + fatKcal + carbKcal + alcoholKcal

  const hasData = totalKcal > 0

  const segments = hasData
    ? [
        { key: 'protein', label: '蛋白質', kcal: proteinKcal, color: COLORS.protein },
        { key: 'fat', label: '脂質', kcal: fatKcal, color: COLORS.fat },
        { key: 'carb', label: '碳水化合物', kcal: carbKcal, color: COLORS.carb },
        ...(alcoholKcal > 0 ? [{ key: 'alcohol', label: '酒精', kcal: alcoholKcal, color: COLORS.alcohol }] : []),
      ]
    : []

  let cumulative = 0
  const arcs = segments.map((seg) => {
    const fraction = seg.kcal / totalKcal
    const dash = fraction * CIRCUMFERENCE
    const offset = cumulative * CIRCUMFERENCE
    cumulative += fraction
    return { ...seg, percent: Math.round(fraction * 100), dash, offset }
  })

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">今日三大營養素比例</h3>
        {targetRatioText && (
          <span className="text-xs text-text-muted bg-surface-muted rounded-full px-3 py-1">目標比例 {targetRatioText}</span>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-text-subtle py-8 text-center">今天還沒有飲食紀錄</p>
      ) : (
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="relative shrink-0" style={{ width: RADIUS * 2 + STROKE_WIDTH, height: RADIUS * 2 + STROKE_WIDTH }}>
            <svg
              width={RADIUS * 2 + STROKE_WIDTH}
              height={RADIUS * 2 + STROKE_WIDTH}
              viewBox={`0 0 ${RADIUS * 2 + STROKE_WIDTH} ${RADIUS * 2 + STROKE_WIDTH}`}
            >
              <g transform={`rotate(-90 ${RADIUS + STROKE_WIDTH / 2} ${RADIUS + STROKE_WIDTH / 2})`}>
                {arcs.map((arc) => (
                  <circle
                    key={arc.key}
                    cx={RADIUS + STROKE_WIDTH / 2}
                    cy={RADIUS + STROKE_WIDTH / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
                    strokeDashoffset={-arc.offset}
                    strokeLinecap="butt"
                  />
                ))}
              </g>
            </svg>

            {arcs.map((arc, i) => {
              const midFraction = (arc.offset + arc.dash / 2) / CIRCUMFERENCE
              const angle = midFraction * 2 * Math.PI - Math.PI / 2
              const labelRadius = RADIUS + STROKE_WIDTH / 2 + 22
              const cx = RADIUS + STROKE_WIDTH / 2
              const cy = RADIUS + STROKE_WIDTH / 2
              const x = cx + labelRadius * Math.cos(angle)
              const y = cy + labelRadius * Math.sin(angle)
              if (arc.percent < 5) return null // 太小的扇區不放外部標籤，避免擠在一起看不清楚
              return (
                <div
                  key={arc.key}
                  className="absolute text-xs font-medium whitespace-nowrap"
                  style={{
                    left: x,
                    top: y,
                    transform: 'translate(-50%, -50%)',
                    color: arc.color,
                  }}
                >
                  {arc.label} {arc.percent}%
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-2">
            {arcs.map((arc) => (
              <div key={arc.key} className="flex items-center gap-2 text-sm text-text-muted">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: arc.color }} />
                <span>{arc.label}</span>
                <span className="text-text-subtle text-xs">{arc.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alcoholKcal > 0 && (
        <p className="text-xs text-text-subtle mt-3">
          酒精熱量已計入總熱量與此比例圖，但不計入蛋白質/脂質/碳水的目標比例基準
        </p>
      )}
    </div>
  )
}
