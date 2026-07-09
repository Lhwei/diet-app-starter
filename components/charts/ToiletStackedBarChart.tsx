'use client'

// 每日如廁次數（尿尿/大便）堆疊長條圖（常駐於「每日總覽」區塊）
//
// 改用 Recharts 的 BarChart + 兩個 Bar 疊加（stackId相同）重寫，
// 取代前一版手刻SVG的寫法，視覺語言與MealStackedBarChart.tsx（推測同樣是Recharts BarChart疊加）一致。

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HealthBehaviorBucket } from '@/lib/dashboard/aggregatePhysio'

interface Props {
  data: HealthBehaviorBucket[]
}

const PEE_COLOR = '#3b82f6'
const POOP_COLOR = '#92400e'

export default function ToiletStackedBarChart({ data }: Props) {
  const chartData = data.map((d) => ({ label: d.label, 尿尿: d.peeCount, 大便: d.poopCount }))
  const totalPee = data.reduce((a, b) => a + b.peeCount, 0)
  const totalPoop = data.reduce((a, b) => a + b.poopCount, 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold">每日如廁次數</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>尿尿 共{totalPee}次</span>
          <span>大便 共{totalPoop}次</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="尿尿" stackId="toilet" fill={PEE_COLOR} radius={[0, 0, 0, 0]} />
          <Bar dataKey="大便" stackId="toilet" fill={POOP_COLOR} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
