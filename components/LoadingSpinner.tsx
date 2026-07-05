// 可重複使用的載入中動畫元件
//
// 用法範例：
//   {isLoading ? <LoadingSpinner /> : <實際內容 />}
//
// 也可以自訂文字跟大小：
//   <LoadingSpinner label="資料載入中..." size="sm" />

interface LoadingSpinnerProps {
  label?: string
  size?: 'sm' | 'md' | 'lg'
  emoji?: string
}

const sizeMap = {
  sm: 'w-8 h-8 text-base',
  md: 'w-12 h-12 text-xl',
  lg: 'w-16 h-16 text-2xl',
}

export default function LoadingSpinner({
  label = '載入中...',
  size = 'md',
  emoji = '🍑',
}: LoadingSpinnerProps) {
  const sizeClass = sizeMap[size]

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`relative ${sizeClass}`}>
        <div className="absolute inset-0 rounded-full border-4 border-pink-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-400 border-r-pink-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          {emoji}
        </div>
      </div>
      {label && <p className="text-sm text-gray-400 animate-pulse">{label}</p>}
    </div>
  )
}
