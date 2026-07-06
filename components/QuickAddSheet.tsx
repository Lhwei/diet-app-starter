'use client'

// "+" 按鈕點擊後跳出的選單：選擇要新增「飲食紀錄」或「生理紀錄」
// 底部彈出的 action sheet 樣式，符合手機使用習慣；點擊遮罩或取消都會關閉

interface QuickAddSheetProps {
  onClose: () => void
  onChoose: (target: 'diet' | 'physio') => void
}

export default function QuickAddSheet({ onClose, onChoose }: QuickAddSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4 space-y-2">
        <p className="text-sm font-medium text-gray-500 px-2 pt-1 pb-2">新增紀錄</p>

        <button
          onClick={() => onChoose('diet')}
          className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 hover:bg-gray-50"
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
          className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 hover:bg-gray-50"
        >
          <span className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </span>
          <span className="text-sm font-medium text-gray-900">生理紀錄</span>
        </button>

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-gray-400 py-2.5"
        >
          取消
        </button>
      </div>
    </div>
  )
}
