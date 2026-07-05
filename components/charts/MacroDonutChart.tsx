'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Props {
  protein: number
  fat: number
  carb: number
  targetRatioText?: string | null // 例如 "20/30/50"（蛋白質/脂質/碳水），來自個人資料
}

const COLORS = { 蛋白質: '#3b82f6', 脂質: '#f59e0b', 碳水化合物: '#10b981' }

export default function MacroDonutChart({ protein, fat, carb, targetRatioText }: Props) {
  const total = protein + fat + carb
  const data = [
    { name: '蛋白質', value: protein },
    { name: '脂質', value: fat },
    { name: '碳水化合物', value: carb },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold">今日三大營養素比例</h3>
        {targetRatioText ? (
          <span className="text-xs bg-blue-50 text-blue-600 rounded-full px-3 py-1 font-medium">
            目標比例 {targetRatioText}
          </span>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-3 py-1">尚未設定目標比例</span>
        )}
      </div>
      {total === 0 ? (
        <p className="text-gray-400 text-sm py-16 text-center">今天還沒有紀錄</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent! * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
