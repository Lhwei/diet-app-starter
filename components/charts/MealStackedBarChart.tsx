'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DayBucket } from '@/lib/dashboard/aggregateDiet'

interface Props {
  data: DayBucket[]
}

const MEAL_COLORS: Record<string, string> = {
  早餐: '#60a5fa',
  午餐: '#34d399',
  晚餐: '#fbbf24',
  點心: '#f472b6',
  宵夜: '#a78bfa',
}

export default function MealStackedBarChart({ data }: Props) {
  const chartData = data.map((d) => ({ label: d.label, ...d.mealBreakdown }))
  const mealTypes = Object.keys(MEAL_COLORS)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="font-semibold mb-4">餐別熱量分佈</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {mealTypes.map((meal) => (
            <Bar key={meal} dataKey={meal} stackId="meals" fill={MEAL_COLORS[meal]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
