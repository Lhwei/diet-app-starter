'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import { TrendPoint } from '@/lib/dashboard/aggregatePhysio'
import TargetStatusBadge from '../TargetStatusBadge'

interface Props {
  data: TrendPoint[]
  targetWeight: number | null
}

export default function WeightTrendChart({ data, targetWeight }: Props) {
  const chartData = data.filter((d) => d.weight !== undefined || d.weightMA7 !== undefined)
  const latestWeight = [...chartData].reverse().find((d) => d.weight !== undefined)?.weight ?? null

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold mb-4">體重變化</h3>
        <p className="text-gray-400 text-sm py-12 text-center">尚無體重紀錄</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-semibold">體重變化</h3>
        <TargetStatusBadge label="體重" current={latestWeight} target={targetWeight} unit="kg" />
      </div>
      <p className="text-xs text-gray-400 mb-4">灰線為7日移動平均，平滑每日水分波動干擾</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip />
          <Legend />
          {targetWeight !== null && (
            <ReferenceLine
              y={targetWeight}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: `目標 ${targetWeight}kg`, position: 'insideTopRight', fontSize: 11, fill: '#ef4444' }}
            />
          )}
          <Line type="monotone" dataKey="weight" name="體重(kg)" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="weightMA7" name="7日移動平均" stroke="#9ca3af" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
