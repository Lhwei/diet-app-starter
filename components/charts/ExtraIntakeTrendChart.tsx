'use client'

// 糖／酒精 長期攝取趨勢圖（咖啡因已移到 WaterCaffeineChart.tsx 跟飲水量合併顯示）

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DayBucket } from '@/lib/dashboard/aggregateDiet'

interface Props {
  data: DayBucket[]
}

const SERIES = [
  { key: 'sugarServings' as const, label: '糖', unit: '份', color: '#ec4899' },
  { key: 'alcoholCalories' as const, label: '酒精熱量', unit: 'kcal', color: '#a855f7' },
]

export default function ExtraIntakeTrendChart({ data }: Props) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-4 sm:p-5 space-y-5">
      <div>
        <h3 className="font-semibold">糖／酒精 攝取趨勢</h3>
        <p className="text-xs text-text-subtle mt-0.5">觀察是否有異常增加的攝取模式</p>
      </div>

      {SERIES.map((series) => {
        const chartData = data.map((d) => ({ label: d.label, [series.label]: d[series.key] as number }))
        const total = data.reduce((sum, d) => sum + (d[series.key] as number), 0)

        return (
          <div key={series.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: series.color }} />
                <span className="text-sm font-medium text-text-body">{series.label}</span>
              </div>
              <span className="text-xs text-text-subtle">
                區間累計 {Math.round(total * 10) / 10} {series.unit}
              </span>
            </div>

            {total === 0 ? (
              <p className="text-xs text-text-disabled py-4 text-center">這段時間沒有{series.label}攝取紀錄</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} width={32} />
                  <Tooltip />
                  <Line type="monotone" dataKey={series.label} stroke={series.color} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )
      })}
    </div>
  )
}
