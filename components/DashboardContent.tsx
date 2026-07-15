'use client'

// 健康儀表板主容器 —— 手機優先的資訊層級重新設計
//
// 本次異動：在「每日總覽」區塊新增飲水量趨勢圖 + 如廁次數堆疊長條圖，
// 常駐顯示（不放進可收合的趨勢分析區塊），跟飲食的熱量/營養素圖表並列。
// 這兩個新圖表獨立成 WaterToiletChart.tsx，自己讀生理紀錄資料，
// 不會讓 DietDashboard.tsx 跨界處理生理紀錄資料，維持飲食/生理兩條資料流分工清楚。

import { useState } from 'react'
import TimeRangeTabs from './TimeRangeTabs'
import DietDashboard from './DietDashboard'
import PhysioDashboard from './PhysioDashboard'
import WeightProjectionCard from './WeightProjectionCard'
import WaterToiletChart from './WaterToiletChart'

function SectionHeader({
  title,
  subtitle,
  collapsible,
  expanded,
  onToggle,
}: {
  title: string
  subtitle: string
  collapsible?: boolean
  expanded?: boolean
  onToggle?: () => void
}) {
  return (
    <button
      type="button"
      onClick={collapsible ? onToggle : undefined}
      className={`w-full flex items-start justify-between gap-3 text-left ${collapsible ? '' : 'cursor-default'}`}
    >
      <div>
        <h2 className="text-base font-bold text-text-strong">{title}</h2>
        <p className="text-xs text-text-subtle mt-0.5">{subtitle}</p>
      </div>
      {collapsible && (
        <svg
          className={`w-4 h-4 mt-1 text-text-subtle shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  )
}

export default function DashboardContent() {
  const [days, setDays] = useState(30)
  const [trendExpanded, setTrendExpanded] = useState(false)

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 sm:-mx-0 sm:px-0 sm:static sm:bg-transparent border-b border-border-subtle sm:border-0 mb-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-subtle shrink-0 hidden">時間範圍</p>
          <TimeRangeTabs value={days} onChange={setDays} />
        </div>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <SectionHeader
            title="目標達成預估"
            subtitle="照目前速度推算，你何時能達成目標體重"
          />
          <WeightProjectionCard />
        </section>

        <section className="bg-surface rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
          <SectionHeader
            title="每日總覽"
            subtitle="熱量、營養素比例、飲水與六大類飲食達成狀況"
          />
          <DietDashboard days={days} />
          <WaterToiletChart days={days} />
        </section>

        <section className="bg-surface rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
          <SectionHeader
            title="趨勢分析"
            subtitle="體重、體脂、血壓等長期變化"
            collapsible
            expanded={trendExpanded}
            onToggle={() => setTrendExpanded((v) => !v)}
          />
          {trendExpanded && <PhysioDashboard days={days} />}
        </section>
      </div>
    </div>
  )
}
