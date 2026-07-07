'use client'

// 電腦版導覽列右側「新增」按鈕
// 手機版是底部導覽正中央的圓形+按鈕（MobileBottomNav.tsx），
// 電腦版把同樣的「+新增」功能放在頂部/側邊導覽列最右側，共用同一個 QuickAddSheet 選單，
// 避免同一份「選飲食紀錄或生理紀錄」的邏輯要維護兩套。
//
// QuickAddSheet 本身已經用 sm:items-center sm:justify-center 讓桌面版自動變成
// 「畫面正中央的置中彈窗」而非「手機版的底部滑出選單」，這裡不需要額外處理RWD。

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import QuickAddSheet from './QuickAddSheet'

export default function DesktopAddButton() {
  const router = useRouter()
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  function handleQuickAddChoice(target: 'diet' | 'physio') {
    setShowQuickAdd(false)
    router.push(target === 'diet' ? '/diet?new=1' : '/physio?new=1')
  }

  return (
    <>
      <button
        onClick={() => setShowQuickAdd(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium px-3.5 py-2 hover:bg-gray-800"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        新增
      </button>

      {showQuickAdd && (
        <QuickAddSheet onClose={() => setShowQuickAdd(false)} onChoose={handleQuickAddChoice} />
      )}
    </>
  )
}
