'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from 'recharts'
import { TrendPoint, bmiZone } from '@/lib/dashboard/aggregatePhysio'

interface Props {
  data: TrendPoint[]
  hasHeight: boolean
}

const ZONE_LABELS: Record<string, { text: string; color: string }> = {
  underweight: { text: '過輕', color: 'bg-warning-soft text-warning' },
  normal: { text: '正常', color: 'bg-success-soft text-success' },
  overweight: { text: '過重', color: 'bg-warning-soft text-warning' },
  obese: { text: '肥胖', color: 'bg-danger-soft text-danger' },
}

export default function BmiTrendChart({ data, hasHeight }: Props) {
  const chartData = data.filter((d) => d.bmi !== undefined)
  const latestBmi = [...chartData].reverse().find((d) => d.bmi !== undefined)?.bmi ?? null
  const zone = latestBmi !== null ? bmiZone(latestBmi) : null

  if (!hasHeight) {
    return (
      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold mb-4">BMI變化</h3>
        <p className="text-warning text-sm py-12 text-center">
          個人資料尚未填寫身高，無法計算BMI，請先到「設定」補上身高資料
        </p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold mb-4">BMI變化</h3>
        <p className="text-text-subtle text-sm py-12 text-center">尚無體重紀錄可計算BMI</p>
      </div>
    )
  }

  const maxBmi = Math.max(...chartData.map((d) => d.bmi!), 28)

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-semibold">BMI變化</h3>
        {zone && (
          <span className={`text-xs rounded-full px-3 py-1 font-medium ${ZONE_LABELS[zone].color}`}>
            現況 BMI {latestBmi} · {ZONE_LABELS[zone].text}（目標區間 18.5-24 正常）
          </span>
        )}
      </div>
      <p className="text-xs text-text-subtle mb-4">背景色：黃=過輕 綠=正常 橘=過重 紅=肥胖</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12 }} domain={[15, Math.max(maxBmi + 2, 28)]} />
          <ReferenceArea y1={0} y2={18.5} fill="#fef08a" fillOpacity={0.4} />
          <ReferenceArea y1={18.5} y2={24} fill="#bbf7d0" fillOpacity={0.4} />
          <ReferenceArea y1={24} y2={27} fill="#fed7aa" fillOpacity={0.4} />
          <ReferenceArea y1={27} y2={40} fill="#fecaca" fillOpacity={0.4} />
          <Tooltip />
          <Line type="monotone" dataKey="bmi" name="BMI" stroke="#111827" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
