'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from 'recharts'
import { TrendPoint } from '@/lib/dashboard/aggregatePhysio'
import TargetStatusBadge from '../TargetStatusBadge'

interface Props {
  data: TrendPoint[]
  gender: string | null
}

// 健康體脂率參考範圍（衛福部/一般常見標準）：男 15-25%，女 20-30%
function getHealthyRange(gender: string | null): [number, number] | null {
  if (gender === '男') return [15, 25]
  if (gender === '女') return [20, 30]
  return null
}

export default function BodyFatTrendChart({ data, gender }: Props) {
  const chartData = data.filter((d) => d.bodyFat !== undefined)
  const latestBodyFat = [...chartData].reverse().find((d) => d.bodyFat !== undefined)?.bodyFat ?? null
  const healthyRange = getHealthyRange(gender)

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold mb-4">體脂率變化</h3>
        <p className="text-gray-400 text-sm py-12 text-center">尚無體脂率紀錄</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-semibold">體脂率變化</h3>
        {healthyRange ? (
          <TargetStatusBadge label="體脂率上限" current={latestBodyFat} target={healthyRange[1]} unit="%" />
        ) : (
          <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-3 py-1">設定性別後可顯示健康範圍</span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">體重停滯但體脂下降時，代表身體組成正在改善</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          {healthyRange && (
            <ReferenceArea y1={healthyRange[0]} y2={healthyRange[1]} fill="#bbf7d0" fillOpacity={0.4} />
          )}
          <Tooltip />
          <Line type="monotone" dataKey="bodyFat" name="體脂率(%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
