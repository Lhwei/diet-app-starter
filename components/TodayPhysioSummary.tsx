'use client'

// 設定頁專用：只顯示「今天」的生理紀錄摘要，完整列表/歷史紀錄請到 /physio 頁面查看
// 沿用 usePhysioRecords 這個既有的SWR hook，days=1 只抓最近1天，資料量小、載入快

import Link from 'next/link'
import { usePhysioRecords } from '@/lib/hooks/useNotionData'
import LoadingSpinner from './LoadingSpinner'

function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export default function TodayPhysioSummary() {
  const { records, isLoading } = usePhysioRecords(1)

  if (isLoading && records.length === 0) {
    return <LoadingSpinner label="生理紀錄載入中..." emoji="⚖️" size="sm" />
  }

  const todayRecords = records.filter((r: any) => isToday(r.recordDate))

  return (
    <div className="space-y-3">
      {todayRecords.length === 0 ? (
        <p className="text-sm text-gray-400">今天還沒有生理紀錄</p>
      ) : (
        <div className="space-y-2">
          {todayRecords.map((r: any) => (
            <div key={r.id} className="flex flex-wrap gap-4 text-sm bg-gray-50 rounded-xl px-4 py-3">
              {r.weightKg && <span>體重 <strong>{r.weightKg}kg</strong></span>}
              {r.bloodSugar && <span>血糖 <strong>{r.bloodSugar}mg/dL</strong></span>}
              {r.bloodPressure && <span>血壓 <strong>{r.bloodPressure}</strong></span>}
            </div>
          ))}
        </div>
      )}

      <Link
        href="/physio"
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        查看完整生理紀錄 →
      </Link>
    </div>
  )
}
