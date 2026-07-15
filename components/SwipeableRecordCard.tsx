'use client'

// 左滑刪除卡片：向左拖曳超過門檻 = 露出刪除按鈕，再點擊確認刪除
// 點擊右側展開圖示 = 編輯
//
// 修正紀錄 v5（點擊行為分離）：
// - v4 之前：點卡片任何地方都會觸發 onEdit()，跟「左滑刪除」共用同一張
//   卡片的觸控範圍，容易誤觸——手指稍微抖動就可能被 TAP_THRESHOLD 誤判
//   成「點擊」而跳進編輯畫面。
// - v5 改法：卡片本體點擊不再做任何事（頂多收回已展開的滑軌），改成用
//   卡片右側一顆明確的展開圖示按鈕(chevron)來觸發 onEdit()，操作意圖更
//   清楚，也跟「左滑刪除」的手勢範圍徹底分開。
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

    // 點擊(位移量小於門檻)只做一件事：如果滑軌已經展開(露出刪除按鈕)，
    // 收回滑軌。不再觸發 onEdit()——編輯改由右側展開圖示按鈕負責。
    if (maxMoveRef.current < TAP_THRESHOLD) {
      if (translateX !== 0) {
        setTranslateX(0)
      }
      return
    }

    setTranslateX((current) => (current <= -REVEAL_THRESHOLD ? -REVEAL_WIDTH : 0))
  }

  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation()
    // 若滑軌目前是展開狀態，點展開圖示時先收回滑軌，不順便觸發編輯，
    // 避免使用者原本只是想收回刪除按鈕卻不小心跳進編輯畫面。
    if (translateX !== 0) {
      setTranslateX(0)
      return
    }
    onEdit()
  }

  return (
    <div
      className="relative overflow-hidden shadow-sm"
      style={{
        borderRadius: RADIUS,
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-danger rounded-r-[18px]"
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
        className="relative bg-surface select-none flex items-center"
      >
        {/* 卡片內容占滿剩餘空間，min-w-0 讓內部文字/chip在窄螢幕正常換行或截斷，
            不會把右側展開按鈕擠出畫面外 */}
        <div className="flex-1 min-w-0">{children}</div>

        {/* 展開圖示按鈕：唯一會觸發 onEdit() 的地方。放在卡片內容右側，
            跟父層排版分開，不會被 children 內部樣式意外覆蓋 */}
        <button
          type="button"
          onClick={handleEditClick}
          aria-label="編輯紀錄"
          className="shrink-0 self-stretch px-3 flex items-center justify-center text-text-disabled hover:text-text-muted hover:bg-background"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    </div>
  )
}