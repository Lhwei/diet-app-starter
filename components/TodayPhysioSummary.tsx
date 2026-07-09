'use client'

// 設定頁專用：只顯示「今天」的生理紀錄摘要，完整列表/歷史紀錄請到 /physio 頁面查看
// 沿用 usePhysioRecords 這個既有的SWR hook，days=1 只抓最近1天，資料量小、載入快
//
// 修正記錄(舊)：原本讀取 r.weightKg / r.bloodPressure，改成對齊 physioMapper.ts
// 實際輸出的欄位名稱 weight / systolic+diastolic。
//
// 修正記錄(新)：新增QuickAddSheet快捷按鈕後，今天的紀錄可能「只有」waterIntake
// 或toiletType（沒有weight/bloodSugar/systolic任何體位量測值）。原本畫面只判斷
// 體位這三種欄位，遇到只有飲水/如廁的紀錄時，三個欄位全部是null，卡片渲染出
// 完全空白的內容，看起來就像卡在讀取中、什麼都沒顯示。這裡補上waterIntake跟
// toiletType的顯示邏輯，並且把「今天完全沒有任何欄位有值」的紀錄過濾掉，
// 避免真的渲染出空白卡片。
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

// 判斷這筆紀錄是否有任何一項可顯示的內容，避免渲染出完全空白的卡片
function hasDisplayableValue(r: any): boolean {
  return (
    r.weight != null ||
    r.bloodSugar != null ||
    r.systolic != null ||
    r.waterIntake != null ||
    r.toiletType != null
  )
}

export default function TodayPhysioSummary() {
  const { records, isLoading } = usePhysioRecords(1)

  if (isLoading && records.length === 0) {
    return <LoadingSpinner label="生理紀錄載入中..." emoji="⚖️" size="sm" />
  }

  const todayRecords = records.filter((r: any) => isToday(r.recordDate) && hasDisplayableValue(r))

  // 今天若有多筆飲水/如廁快捷紀錄，各自加總顯示成一行摘要，
  // 不會像體位量測值一樣一筆一筆列出來（那樣一天喝5次水會出現5行，太雜）
  const totalWater = todayRecords.reduce((sum: number, r: any) => sum + (r.waterIntake ?? 0), 0)
  const peeCount = todayRecords.filter((r: any) => r.toiletType === '尿尿').length
  const poopCount = todayRecords.filter((r: any) => r.toiletType === '大便').length

  // 體位量測值（體重/血糖/血壓）維持原本一筆一筆列出的呈現方式
  const measurementRecords = todayRecords.filter(
    (r: any) => r.weight != null || r.bloodSugar != null || r.systolic != null
  )

  const hasAnySummary = measurementRecords.length > 0 || totalWater > 0 || peeCount > 0 || poopCount > 0

  return (
    <div className="space-y-3">
      {!hasAnySummary ? (
        <p className="text-sm text-gray-400">今天還沒有生理紀錄</p>
      ) : (
        <div className="space-y-2">
          {measurementRecords.map((r: any) => {
            const bloodPressure = formatBloodPressure(r)
            return (
              <div key={r.id} className="flex flex-wrap gap-4 text-sm bg-gray-50 rounded-xl px-4 py-3">
                {r.weight != null && <span>體重 <strong>{r.weight}kg</strong></span>}
                {r.bloodSugar != null && <span>血糖 <strong>{r.bloodSugar}mg/dL</strong></span>}
                {bloodPressure && <span>血壓 <strong>{bloodPressure}</strong></span>}
              </div>
            )
          })}

          {(totalWater > 0 || peeCount > 0 || poopCount > 0) && (
            <div className="flex flex-wrap gap-4 text-sm bg-gray-50 rounded-xl px-4 py-3">
              {totalWater > 0 && <span>飲水 <strong>{totalWater}ml</strong></span>}
              {peeCount > 0 && <span>尿尿 <strong>{peeCount}次</strong></span>}
              {poopCount > 0 && <span>大便 <strong>{poopCount}次</strong></span>}
            </div>
          )}
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
