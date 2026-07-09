'use client'

// 飲水/咖啡因 + 如廁次數 常駐圖表容器
//
// WaterCaffeineChart 自己跨界fetch physio-summary + diet-summary 兩份API並合併顯示，
// ToiletStackedBarChart 只需physio-summary，這裡統一fetch一次physio資料傳給如廁圖，
// 避免同一份physio-summary API被WaterCaffeineChart內部跟這裡重複打兩次。

import { useEffect, useMemo, useState } from 'react'
import WaterCaffeineChart from './charts/WaterCaffeineChart'
import ToiletStackedBarChart from './charts/ToiletStackedBarChart'
import { bucketHealthBehaviorByDay, PhysioRecordRaw } from '@/lib/dashboard/aggregatePhysio'
import LoadingSpinner from './LoadingSpinner'

interface Props {
  days: number
}

export default function WaterToiletChart({ days }: Props) {
  const [records, setRecords] = useState<PhysioRecordRaw[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const res = await fetch(`/api/dashboard/physio-summary?days=${days}`)
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error || '讀取失敗')
        }
        const data = await res.json()
        if (cancelled) return
        setRecords(data.records)
      } catch (err: any) {
        if (!cancelled) setError(err.message)
      }
    }
    load()
    return () => { cancelled = true }
  }, [days])

  const buckets = useMemo(() => (records ? bucketHealthBehaviorByDay(records, days) : []), [records, days])

  if (error === 'notion_not_ready') return null
  if (error) return <p className="text-red-600 text-sm">生理資料讀取失敗：{error}</p>
  if (records === null) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <WaterCaffeineChart days={days} />
      <ToiletStackedBarChart data={buckets} />
    </div>
  )
}
