'use client'

// 手機版固定底部登入按鈕 —— 對應暖色手繪風視覺系統

import { login } from '@/app/login/actions'

export default function LoginMobileCTA() {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFF8EE]/95 backdrop-blur-sm border-t-2 border-[#3A3A3A]/10 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <form>
        <button
          formAction={login}
          className="w-full flex items-center justify-center gap-2 bg-[#E8846B] text-white rounded-full py-3.5 font-bold hover:bg-[#DD7458] transition shadow-[3px_3px_0_0_rgba(58,58,58,0.15)]"
        >
          使用 Google 登入
        </button>
      </form>
    </div>
  )
}
