'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import { TrendPoint } from '@/lib/dashboard/aggregatePhysio'
import TargetStatusBadge from '../TargetStatusBadge'

interface Props {
  data: TrendPoint[]
  waistHealthyMax: number | null
}

export default function WaistTrendChart({ data, waistHealthyMax }: Props) {
  const chartData = data.filter((d) => d.waist !== undefined)
  const latestWaist = [...chartData].reverse().find((d) => d.waist !== undefined)?.waist ?? null

  if (chartData.length === 0) {
    return (
      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold mb-4">腰圍/腰臀比</h3>
        <p className="text-text-subtle text-sm py-12 text-center">尚無腰圍紀錄</p>
      </div>
    )
  }

  const hasRatio = chartData.some((d) => d.waistHipRatio !== undefined)

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-semibold">腰圍/腰臀比</h3>
        <TargetStatusBadge label="腰圍上限" current={latestWaist} target={waistHealthyMax} unit="cm" />
      </div>
      <p className="text-xs text-text-subtle mb-4">代謝症候群核心指標，比體重更早反映內臟脂肪變化</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          {hasRatio && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0.6, 1.2]} />}
          <Tooltip />
          <Legend />
          {waistHealthyMax !== null && (
            <ReferenceLine
              yAxisId="left"
              y={waistHealthyMax}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: `健康上限 ${waistHealthyMax}cm`, position: 'insideTopRight', fontSize: 11, fill: '#ef4444' }}
            />
          )}
          <Line yAxisId="left" type="monotone" dataKey="waist" name="腰圍(cm)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
          {hasRatio && (
            <Line yAxisId="right" type="monotone" dataKey="waistHipRatio" name="腰臀比" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
