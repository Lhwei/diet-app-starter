'use client'

// Hero v3 —— 溫暖手繪風插畫美學
// 對應使用者提供的插畫風格：粉彩蠟筆質感、暖色調(奶油白/鵝黃/珊瑚紅/霧藍)、手繪不規則線條、
// 溫馨居家感，取代上一版偏冷調科技SaaS的深色漸層Bento Grid語言。
//
// 視覺語言轉換：
// 1. 背景改成溫暖米白/奶油色，不用冷色漸層光暈
// 2. 標題字體改用較圓潤的粗細對比，搭配手繪風的裝飾線條(用簡單SVG畫波浪底線/圈選強調)
// 3. 插畫框改成不規則圓角+淡色描邊，模仿手繪畫框感，而非銳利的科技感陰影
// 4. 按鈕改成溫暖的珊瑚色系，取代原本的黑色/深灰科技感按鈕

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { login } from '@/app/login/actions'

const ILLUSTRATION_COUNT = 13

export default function LoginHero() {
  const [illustrationSrc, setIllustrationSrc] = useState<string | null>(null)

  useEffect(() => {
    const index = Math.floor(Math.random() * ILLUSTRATION_COUNT) + 1
    setIllustrationSrc(`/images/landingpage/${index}.png`)
  }, [])

  return (
    <section className="relative min-h-[92vh] sm:min-h-screen overflow-hidden bg-[#FFF8EE]">
      <div className="absolute top-10 -left-16 w-56 h-56 sm:w-80 sm:h-80 bg-[#BFDCE8] rounded-[45%_55%_60%_40%] opacity-40 blur-2xl" />
      <div className="absolute bottom-0 -right-16 w-64 h-64 sm:w-96 sm:h-96 bg-[#F6C567] rounded-[55%_45%_40%_60%] opacity-40 blur-2xl" />
      <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-[#E8846B] rounded-full opacity-20 blur-2xl" />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-10 sm:pt-20 pb-10 flex flex-col items-center text-center min-h-[92vh] sm:min-h-screen justify-center">
        <div className="inline-flex items-center gap-2 bg-white border-2 border-[#3A3A3A]/10 rounded-full px-4 py-2 mb-6 shadow-[2px_2px_0_0_rgba(58,58,58,0.08)]">
          <span className="text-sm">🍳</span>
          <span className="text-xs font-medium text-[#7A6A5A]">免費使用，資料帶著走</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] mb-5 text-[#3A3A3A]">
          <span className="relative inline-block">
            記錄健康，輕鬆簡單
            <svg
              className="absolute left-0 -bottom-2 w-full"
              height="12" viewBox="0 0 300 12" preserveAspectRatio="none"
            >
              <path d="M2 8 Q75 2 150 7 T298 5" stroke="#E8846B" strokeWidth="5" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#7A6A5A] max-w-xl my-4 leading-relaxed">
          每天十秒快速紀錄，建立長期飲食追蹤<br/>
          自動生成趨勢圖表，幫助了解飲食狀態
        </p>

        <div className="hidden sm:block mb-14">
          <form>
            <button
              formAction={login}
              className="group flex items-center justify-center gap-2 bg-[#E8846B] text-white rounded-full px-9 py-4 text-base font-bold hover:bg-[#DD7458] transition-all shadow-[4px_4px_0_0_rgba(58,58,58,0.15)] hover:shadow-[2px_2px_0_0_rgba(58,58,58,0.15)] hover:translate-x-0.5 hover:translate-y-0.5"
            >
              使用 Google 登入，立即開始
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </form>
        </div>

        <div className="relative w-64 h-64 sm:w-80 sm:h-80">
          <div className="absolute inset-0 bg-white rounded-[38%_62%_58%_42%/48%_42%_58%_52%] border-[3px] border-[#3A3A3A]/10 rotate-3 scale-95 shadow-[6px_6px_0_0_rgba(58,58,58,0.06)]" />
          <div className="absolute inset-0 flex items-center justify-center p-6 animate-[float_4s_ease-in-out_infinite]">
            {illustrationSrc ? (
              <Image
                src={illustrationSrc}
                alt="健康紀錄插畫"
                fill
                className="object-contain p-4"
                priority
              />
            ) : (
              <div className="w-full h-full rounded-3xl bg-white/60 animate-pulse" />
            )}
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1 text-[#B0A392] animate-bounce">
          <span className="text-xs">往下滑，看更多</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
      `}</style>
    </section>
  )
}
