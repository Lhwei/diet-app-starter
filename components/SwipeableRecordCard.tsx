'use client'

// 左滑刪除卡片：點擊卡片本體 = 編輯；向左拖曳超過門檻 = 露出刪除按鈕，再點擊確認刪除
//
// 修正紀錄 v4（真正修好圓角）：
// - v3 的錯誤：紅色底層跟白色卡片內層都各自加了 borderRadius，
//   導致紅色層自己就是圓角矩形，滑出來時看起來像整塊圓角的紅色從卡片下方「凸出來」
// - 正確做法：只有最外層容器 (overflow-hidden + borderRadius) 負責裁切成圓角，
//   內部的紅色層跟白色卡片都維持「直角矩形」，靠外層裁切自然變成圓角 —— 不需要、也不該自己加圓角

import { useRef, useState } from 'react'

const REVEAL_WIDTH = 76
const REVEAL_THRESHOLD = 40
const TAP_THRESHOLD = 6
const RADIUS = 16 // px，只在最外層容器套用這一個圓角值，內層不再重複設定

interface SwipeableRecordCardProps {
  children: React.ReactNode
  onEdit: () => void
  onDelete: () => void
  isDeleting?: boolean
}

export default function SwipeableRecordCard({ children, onEdit, onDelete, isDeleting }: SwipeableRecordCardProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startTranslateRef = useRef(0)
  const maxMoveRef = useRef(0)

  function handlePointerDown(e: React.PointerEvent) {
    startXRef.current = e.clientX
    startTranslateRef.current = translateX
    maxMoveRef.current = 0
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return
    const delta = e.clientX - startXRef.current
    maxMoveRef.current = Math.max(maxMoveRef.current, Math.abs(delta))
    const next = Math.min(0, Math.max(-REVEAL_WIDTH, startTranslateRef.current + delta))
    setTranslateX(next)
  }

  function handlePointerUp() {
    if (!isDragging) return
    setIsDragging(false)

    if (maxMoveRef.current < TAP_THRESHOLD) {
      if (translateX !== 0) {
        setTranslateX(0)
      } else {
        onEdit()
      }
      return
    }

    setTranslateX((current) => (current <= -REVEAL_THRESHOLD ? -REVEAL_WIDTH : 0))
  }

  return (
    // 只有這個最外層容器有 overflow-hidden + borderRadius，負責把裡面所有內容裁切成圓角
    // 加 transform: translateZ(0) 讓瀏覽器把這層獨立成GPU合成層，避免動畫時裁切失準的渲染bug
    <div
      className="relative overflow-hidden shadow-sm"
      style={{
        borderRadius: RADIUS,
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      {/* 紅色刪除底層：純直角矩形，不設定 borderRadius，靠外層裁切自然變圓角 */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-r-[18px]"
        style={{ width: REVEAL_WIDTH }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          disabled={isDeleting}
          aria-label="刪除紀錄"
          className="flex flex-col items-center gap-1 text-white disabled:opacity-60 w-full h-full justify-center"
        >
          {isDeleting ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span className="text-[11px]">刪除</span>
            </>
          )}
        </button>
      </div>

      {/* 白色卡片本體：純直角矩形，不設定 borderRadius，靠外層裁切自然變圓角 */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          touchAction: 'pan-y',
        }}
        className="relative bg-white cursor-pointer select-none"
      >
        {children}
      </div>
    </div>
  )
}
