'use client'

// 包一層條件判斷：只有已登入使用者在App內頁面（非/login、非其他公開頁）才顯示底部主導覽列。
// /login 頁面有自己的 LoginMobileCTA 固定登入按鈕，兩者共用 bottom-0 會互相蓋住，
// 所以 /login（以及其他未登入可見的公開頁，如隱私權政策/服務條款）一律不渲染 MobileBottomNav。
//
// 使用方式：在 app/layout.tsx 裡，把原本直接寫的 <MobileBottomNav /> 換成 <ConditionalBottomNav />

import { usePathname } from 'next/navigation'
import MobileBottomNav from './MobileBottomNav'

const HIDDEN_ON_PATHS = ['/login', ]

export default function ConditionalBottomNav() {
  const pathname = usePathname()
  const shouldHide = HIDDEN_ON_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (shouldHide) return null

  return <MobileBottomNav />
}
