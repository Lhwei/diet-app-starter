'use client'

// 健康儀表板主容器 —— 手機優先的資訊層級重新設計
//
// 設計重點：
// 1. 時間範圍選擇改成頂部sticky，往下滑動時仍固定在螢幕上方，手機上不用滑回頂部就能切換區間
// 2. 資訊層級依「行動優先度」排序，不是依資料類型排序：
//    目標達成預估(今天該不該調整策略) → 每日總覽(今天吃得如何) → 趨勢分析(拉長時間看變化)
//    這跟原本邏輯順序一致，但這次用視覺權重明確區分「現在最需要關注」跟「參考用歷史趨勢」
// 3. 每個區塊加上一句話說明「這區在回答什麼問題」，取代單純的分類標題，降低第一次使用者的理解成本
// 4. 趨勢分析（歷史圖表，通常需要比較多次觀察才有意義）改成可收合，預設收合在手機上，
//    避免使用者一打開就要滑很長的距離才能看到「今天的摘要」，收合狀態記住在session內（用state即可，不用持久化）
// 5. 區塊之間用更明確的視覺分隔（灰底背景區隔卡片 vs 白底容器），手機小螢幕上更容易分辨區塊邊界

import { useState } from 'react'
import TimeRangeTabs from './TimeRangeTabs'
import DietDashboard from './DietDashboard'
import PhysioDashboard from './PhysioDashboard'
import WeightProjectionCard from './WeightProjectionCard'

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
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {collapsible && (
        <svg
          className={`w-4 h-4 mt-1 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
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
      {/* 頂部sticky：時間範圍選擇，往下滑動仍固定在畫面上方，手機上不用滑回頂部即可切換 */}
      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4 py-3 sm:-mx-0 sm:px-0 sm:static sm:bg-transparent border-b border-gray-100 sm:border-0 mb-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400 shrink-0 hidden">時間範圍</p>
          <TimeRangeTabs value={days} onChange={setDays} />
        </div>
      </div>

      <div className="space-y-6">
        {/* 第一優先：目標達成預估 —— 回答「照目前速度，什麼時候會達標」，最直接影響今天的行動 */}
        <section className="space-y-3">
          <SectionHeader
            title="目標達成預估"
            subtitle="照目前速度推算，你何時能達成目標體重"
          />
          <WeightProjectionCard />
        </section>

        {/* 第二優先：每日總覽 —— 回答「今天吃得如何」，時效性最強，天天都要看 */}
        <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
          <SectionHeader
            title="每日總覽"
            subtitle="熱量、營養素比例與六大類飲食達成狀況"
          />
          <DietDashboard days={days} />
        </section>

        {/* 第三優先：趨勢分析 —— 回答「拉長時間看，身體正在往哪個方向變化」，屬於參考型資訊
            手機上預設收合，避免一進頁面就要滑很長距離，點擊標題即可展開 */}
        <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
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
