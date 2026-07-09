'use client'

// "+" 按鈕點擊後跳出的選單
//
// 飲水改成不需要點擊展開，直接常駐顯示「250 / 500 / 自訂數字」三個選項，
// 減少一次點擊步驟。自訂數字用一個小型輸入框+送出按鈕，方便輸入非常見的容量
// （例如喝了一半的水瓶剩下380ml這種情況）。
//
// 尿尿/大便維持原本設計：直接點擊就送出，沒有需要選擇的份量或類型。
//
// 本次修正：快捷記錄(飲水/尿尿/大便)送出時，自動依「現在時間」帶入時段標記
// (晨起/睡前/其他)。之前完全沒有帶這個欄位，導致這幾筆快捷紀錄在/physio列表頁
// 第一行左側是空的、跟其他生理紀錄的版面不一致。快捷記錄的設計初衷是「不用填表單、
// 越快越好」，所以不跳出時段選擇器讓使用者選，而是直接依點擊當下的時鐘時間推算：
// - 05:00–09:00 → 晨起
// - 22:00–05:00 → 睡前
// - 其餘時間 → 其他
// 不猜測「餐前/餐後」，因為快捷記錄沒有用餐資料可判斷，硬猜容易誤導。

import { useState } from 'react'

interface QuickAddSheetProps {
  onClose: () => void
  onChoose: (target: 'diet' | 'physio') => void
}

type QuickLogState =
  | { status: 'idle' }
  | { status: 'submitting'; label: string }
  | { status: 'success'; label: string }
  | { status: 'error'; label: string }

function inferTimeSlot(date: Date): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 9) return '晨起'
  if (hour >= 22 || hour < 5) return '睡前'
  return '其他'
}

async function submitPhysioQuickLog(payload: Record<string, any>) {
  const now = new Date()
  const res = await fetch('/api/physio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recordDate: now.toISOString(),
      timeSlot: inferTimeSlot(now),
      ...payload,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || '記錄失敗')
  }
}

export default function QuickAddSheet({ onClose, onChoose }: QuickAddSheetProps) {
  const [customMl, setCustomMl] = useState('')
  const [logState, setLogState] = useState<QuickLogState>({ status: 'idle' })

  const isBusy = logState.status === 'submitting'

  async function handleQuickLog(label: string, payload: Record<string, any>) {
    setLogState({ status: 'submitting', label })
    try {
      await submitPhysioQuickLog(payload)
      setLogState({ status: 'success', label })
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      setLogState({ status: 'error', label })
    }
  }

  function handleCustomSubmit() {
    const ml = Number(customMl)
    if (!ml || ml <= 0) return
    handleQuickLog(`飲水${ml}ml`, { waterIntake: ml })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={isBusy ? undefined : onClose} />

      <div className="relative w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4 space-y-2">
        {logState.status === 'success' && (
          <div className="absolute inset-x-4 -top-14 rounded-xl bg-gray-900 text-white text-sm text-center py-2.5 shadow-lg">
            已記錄{logState.label}
          </div>
        )}
        {logState.status === 'error' && (
          <div className="absolute inset-x-4 -top-14 rounded-xl bg-red-500 text-white text-sm text-center py-2.5 shadow-lg">
            記錄失敗，請再試一次
          </div>
        )}

        <p className="text-sm font-medium text-gray-500 px-2 pt-1 pb-1">完整紀錄</p>

        <button
          onClick={() => onChoose('diet')}
          disabled={isBusy}
          className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 hover:bg-gray-50 disabled:opacity-50"
        >
          <span className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 010 8h-1" />
              <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
            </svg>
          </span>
          <span className="text-sm font-medium text-gray-900">飲食紀錄</span>
        </button>

        <button
          onClick={() => onChoose('physio')}
          disabled={isBusy}
          className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 hover:bg-gray-50 disabled:opacity-50"
        >
          <span className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </span>
          <span className="text-sm font-medium text-gray-900">生理紀錄</span>
        </button>

        <div className="flex items-center gap-2 px-2 pt-3 pb-1">
          <span className="h-px flex-1 bg-gray-100" />
          <span className="text-xs text-gray-400">快捷記錄</span>
          <span className="h-px flex-1 bg-gray-100" />
        </div>

        <div className="rounded-xl border border-gray-200 px-4 py-3.5 space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69s6 6.6 6 10.81a6 6 0 11-12 0c0-4.21 6-10.81 6-10.81z" />
              </svg>
            </span>
            <span className="text-sm font-medium text-gray-900">飲水</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickLog('飲水250ml', { waterIntake: 250 })}
              disabled={isBusy}
              className="flex-1 text-sm rounded-lg border border-sky-200 text-sky-600 py-2 hover:bg-sky-50 disabled:opacity-50"
            >
              250ml
            </button>
            <button
              onClick={() => handleQuickLog('飲水500ml', { waterIntake: 500 })}
              disabled={isBusy}
              className="flex-1 text-sm rounded-lg border border-sky-200 text-sky-600 py-2 hover:bg-sky-50 disabled:opacity-50"
            >
              500ml
            </button>
            <div className="flex-1 flex items-center gap-1">
              <input
                type="number"
                min="1"
                inputMode="numeric"
                placeholder="自訂"
                value={customMl}
                onChange={(e) => setCustomMl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomSubmit()
                }}
                disabled={isBusy}
                className="w-full text-sm text-center rounded-lg border border-gray-200 py-2 px-1 disabled:opacity-50"
              />
              <button
                onClick={handleCustomSubmit}
                disabled={isBusy || !customMl}
                className="shrink-0 w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center disabled:opacity-30"
                aria-label="送出自訂飲水量"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickLog('一次尿尿', { toiletType: '尿尿' })}
            disabled={isBusy}
            className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 hover:bg-gray-50 disabled:opacity-50"
          >
            <span className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69s6 6.6 6 10.81a6 6 0 11-12 0c0-4.21 6-10.81 6-10.81z" />
              </svg>
            </span>
            <span className="text-sm font-medium text-gray-900">尿尿</span>
          </button>

          <button
            onClick={() => handleQuickLog('一次大便', { toiletType: '大便' })}
            disabled={isBusy}
            className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 hover:bg-gray-50 disabled:opacity-50"
          >
            <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
            <span className="text-sm font-medium text-gray-900">大便</span>
          </button>
        </div>

        <button
          onClick={onClose}
          disabled={isBusy}
          className="w-full text-center text-sm text-gray-400 py-2.5 disabled:opacity-50"
        >
          取消
        </button>
      </div>
    </div>
  )
}
