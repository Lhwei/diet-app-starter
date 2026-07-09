'use client'

// 每日飲水量趨勢圖（常駐於「每日總覽」區塊）
//
// 改用 Recharts 重寫，寫法與 CalorieTrendChart.tsx 一致：
// ReferenceLine 畫目標飲水量參考虛線，TargetStatusBadge 顯示平均/目標比較徽章。

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { HealthBehaviorBucket } from '@/lib/dashboard/aggregatePhysio'
import TargetStatusBadge from '../TargetStatusBadge'

interface Props {
  data: HealthBehaviorBucket[]
  targetMl?: number
}

export default function WaterIntakeTrendChart({ data, targetMl = 2500 }: Props) {
  const chartData = data.map((d) => ({ label: d.label, 飲水量: d.waterIntake }))
  const daysWithData = data.filter((d) => d.waterIntake > 0)
  const avgWater = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((sum, d) => sum + d.waterIntake, 0) / daysWithData.length)
    : null

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold">每日飲水量趨勢</h3>
        <TargetStatusBadge label="平均飲水" current={avgWater} target={targetMl} unit="ml" />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <ReferenceLine
            y={targetMl}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            label={{ value: `目標 ${targetMl}ml`, position: 'insideTopRight', fontSize: 11, fill: '#3b82f6' }}
          />
          <Line type="monotone" dataKey="飲水量" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
