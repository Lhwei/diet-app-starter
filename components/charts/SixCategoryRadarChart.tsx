'use client'

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SixCategoryDatum {
  key: string
  label: string
  actual: number
  suggested: number
}

interface Props {
  data: SixCategoryDatum[]
}

export default function SixCategoryRadarChart({ data }: Props) {
  const chartData = data.map((d) => ({ label: d.label, 實際份數: d.actual, 建議份數: d.suggested }))
  const maxSuggested = Math.max(...data.map((d) => d.suggested), 1)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="font-semibold mb-1">今日六大類食物達成率</h3>
      <p className="text-xs text-gray-400 mb-4">建議份數為預設參考值，尚未串接個人化目標</p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, maxSuggested + 1]} tick={{ fontSize: 10 }} />
          <Radar name="建議份數" dataKey="建議份數" stroke="#d1d5db" fill="#d1d5db" fillOpacity={0.3} />
          <Radar name="實際份數" dataKey="實際份數" stroke="#111827" fill="#111827" fillOpacity={0.4} />
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
