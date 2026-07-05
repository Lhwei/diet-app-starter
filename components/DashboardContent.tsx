'use client'

import { useState } from 'react'
import TimeRangeTabs from './TimeRangeTabs'
import DietDashboard from './DietDashboard'
import PhysioDashboard from './PhysioDashboard'
import WeightProjectionCard from './WeightProjectionCard'

export default function DashboardContent() {
  const [days, setDays] = useState(30)

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-400">時間範圍套用於下方所有圖表</p>
        <TimeRangeTabs value={days} onChange={setDays} />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">目標達成預估</h2>
        <WeightProjectionCard />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">每日總覽</h2>
        <DietDashboard days={days} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">趨勢分析</h2>
        <PhysioDashboard days={days} />
      </section>
    </div>
  )
}