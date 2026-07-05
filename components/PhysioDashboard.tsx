'use client'

import { useEffect, useState } from 'react'
import WeightTrendChart from './charts/WeightTrendChart'
import BodyFatTrendChart from './charts/BodyFatTrendChart'
import BmiTrendChart from './charts/BmiTrendChart'
import WaistTrendChart from './charts/WaistTrendChart'
import { buildTrendPoints, PhysioRecordRaw } from '@/lib/dashboard/aggregatePhysio'
import LoadingSpinner from './LoadingSpinner'

interface Props {
  days: number
}

export default function PhysioDashboard({ days }: Props) {
  const [records, setRecords] = useState<PhysioRecordRaw[] | null>(null)
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [targetWeight, setTargetWeight] = useState<number | null>(null)
  const [gender, setGender] = useState<string | null>(null)
  const [waistHealthyMax, setWaistHealthyMax] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const [physioRes, profileRes] = await Promise.all([
          fetch(`/api/dashboard/physio-summary?days=${days}`),
          fetch('/api/dashboard/profile-target'),
        ])

        if (!physioRes.ok) {
          const body = await physioRes.json()
          throw new Error(body.error || '讀取失敗')
        }

        const physioData = await physioRes.json()
        const profileData = await profileRes.json()

        if (cancelled) return
        setRecords(physioData.records)
        setHeightCm(physioData.heightCm ?? profileData.heightCm ?? null)
        setTargetWeight(profileData.targetWeight ?? null)
        setGender(profileData.gender ?? null)
        setWaistHealthyMax(profileData.waistHealthyMax ?? null)
      } catch (err: any) {
        if (!cancelled) setError(err.message)
      }
    }
    load()
    return () => { cancelled = true }
  }, [days])

  if (error === 'notion_not_ready') {
    return (
      <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
        Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
      </div>
    )
  }

  if (error) return <p className="text-red-600">讀取失敗：{error}</p>

  if (records === null) return <LoadingSpinner />

  if (records.length === 0) {
    return <p className="text-gray-400">還沒有生理紀錄，先到「生理紀錄」頁面新增幾筆體重/腰圍紀錄吧！</p>
  }

  const trendPoints = buildTrendPoints(records, heightCm)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <WeightTrendChart data={trendPoints} targetWeight={targetWeight} />
      <BodyFatTrendChart data={trendPoints} gender={gender} />
      <BmiTrendChart data={trendPoints} hasHeight={heightCm !== null} />
      <WaistTrendChart data={trendPoints} waistHealthyMax={waistHealthyMax} />
    </div>
  )
}
