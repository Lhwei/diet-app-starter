'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { DayBucket } from '@/lib/dashboard/aggregateDiet'
import TargetStatusBadge from '../TargetStatusBadge'

interface Props {
  data: DayBucket[]
  targetCalories: number
}

export default function CalorieTrendChart({ data, targetCalories }: Props) {
  const chartData = data.map((d) => ({ label: d.label, 熱量: d.totalCalories }))
  const daysWithData = data.filter((d) => d.totalCalories > 0)
  const avgCalories = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((sum, d) => sum + d.totalCalories, 0) / daysWithData.length)
    : null

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold">每日熱量趨勢</h3>
        <TargetStatusBadge label="平均熱量" current={avgCalories} target={targetCalories} unit="kcal" />
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <ReferenceLine
            y={targetCalories}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: `目標 ${targetCalories}kcal`, position: 'insideTopRight', fontSize: 11, fill: '#ef4444' }}
          />
          <Line type="monotone" dataKey="熱量" stroke="#111827" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
