'use client'

// 手機版底部固定導覽列（sm以下顯示，桌面版沿用原本的頂部/側邊 SideNav，不受影響）
//
// 順序：飲食紀錄、儀表板、+新增（跳出選單選飲食/生理）、遊戲(尚未製作,顯示為disabled)、設定
//
// "+"按鈕原本分散在「飲食紀錄」跟「生理紀錄」頁面各自的「新增紀錄」按鈕，
// 現在統一收整到這裡的 QuickAddSheet；被取代的頁面內按鈕請直接移除（見兩個頁面的patch說明）。
// 導覽到目標頁面時帶上 ?new=1 query，該頁面 useEffect 偵測到後自動開啟新增表單，
// 不需要額外的全域狀態或context，維持跟現有頁面邏輯一致的寫法。

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import QuickAddSheet from './QuickAddSheet'

const navItems = [
  {
    key: 'diet',
    label: '飲食紀錄',
    href: '/diet',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 010 8h-1" />
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    key: 'dashboard',
    label: '儀表板',
    href: '/dashboard',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
  },
  { key: 'add', label: '新增', href: null, icon: null },
  {
    key: 'game',
    label: '遊戲',
    href: null,
    disabled: true,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="6" />
        <line x1="8" y1="12" x2="8" y2="12" />
        <line x1="6" y1="10" x2="6" y2="14" />
        <line x1="16" y1="11" x2="16" y2="11" />
        <line x1="18" y1="13" x2="18" y2="13" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: '設定',
    href: '/settings',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  function handleQuickAddChoice(target: 'diet' | 'physio') {
    setShowQuickAdd(false)
    router.push(target === 'diet' ? '/diet?new=1' : '/physio?new=1')
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-between px-1">
          {navItems.map((item) => {
            if (item.key === 'add') {
              return (
                <button
                  key={item.key}
                  onClick={() => setShowQuickAdd(true)}
                  className="flex-1 flex flex-col items-center justify-center py-2"
                  aria-label="新增紀錄"
                >
                  <span className="w-9 h-9 -mt-4 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                  <span className="text-[11px] text-gray-500 mt-1">{item.label}</span>
                </button>
              )
            }

            const active = item.href ? pathname?.startsWith(item.href) : false

            if (item.disabled) {
              return (
                <div
                  key={item.key}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 text-gray-300"
                  aria-disabled="true"
                >
                  {item.icon!(false)}
                  <span className="text-[11px] mt-1">{item.label}</span>
                </div>
              )
            }

            return (
              <button
                key={item.key}
                onClick={() => router.push(item.href!)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 ${active ? 'text-gray-900' : 'text-gray-400'}`}
              >
                {item.icon!(active)}
                <span className="text-[11px] mt-1">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {showQuickAdd && (
        <QuickAddSheet onClose={() => setShowQuickAdd(false)} onChoose={handleQuickAddChoice} />
      )}
    </>
  )
}
