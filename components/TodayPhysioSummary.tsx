'use client'

// 設定頁專用：只顯示「今天」的生理紀錄摘要，完整列表/歷史紀錄請到 /physio 頁面查看
// 沿用 usePhysioRecords 這個既有的SWR hook，days=1 只抓最近1天，資料量小、載入快
//
// 修正記錄：原本讀取 r.weightKg / r.bloodPressure，但 notionPageToPhysioRecord 實際輸出的
// 欄位名稱是 weight（不是weightKg）、systolic+diastolic分開兩欄（沒有合併的bloodPressure欄位），
// 只有 bloodSugar 欄位名稱剛好對。這導致即使今天有紀錄，體重跟血壓永遠讀不到值、畫面顯示空白。
// 這裡改成直接對齊 physioMapper.ts 實際輸出的欄位名稱。
//
// 另外「今天」的判斷改用 recordDate（使用者實際填寫/手動指定的記錄日期），
// 記錄日期已改存ISO格式，若是舊中文格式(無法被 new Date 解析)則直接視為「不是今天」跳過，不會誤判。

import Link from 'next/link'
import { usePhysioRecords } from '@/lib/hooks/useNotionData'
import LoadingSpinner from './LoadingSpinner'

function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function formatBloodPressure(r: any): string | null {
  if (r.systolic == null) return null
  return `${r.systolic}/${r.diastolic ?? '-'}`
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
          {todayRecords.map((r: any) => {
            const bloodPressure = formatBloodPressure(r)
            return (
              <div key={r.id} className="flex flex-wrap gap-4 text-sm bg-gray-50 rounded-xl px-4 py-3">
                {r.weight != null && <span>體重 <strong>{r.weight}kg</strong></span>}
                {r.bloodSugar != null && <span>血糖 <strong>{r.bloodSugar}mg/dL</strong></span>}
                {bloodPressure && <span>血壓 <strong>{bloodPressure}</strong></span>}
              </div>
            )
          })}
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
