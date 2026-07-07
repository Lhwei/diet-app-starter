'use client'

// 條件式頂部導覽列：只有已登入使用者在App內頁面才顯示Navbar。
// /login（以及其他未登入可見的公開頁，如隱私權政策/服務條款）不渲染Navbar，
// 原理跟 ConditionalBottomNav.tsx 完全一樣——這兩個檔案通常會一起用在 app/layout.tsx 裡。
//
// 使用方式：在 app/layout.tsx 裡，把原本直接寫的 <Navbar />（或你專案裡實際的頂部導覽列元件名稱）
// 換成 <ConditionalNavbar />。如果你的頂部導覽列元件不是叫 Navbar，
// 把下面 import 的路徑跟元件名稱換成實際檔名即可，邏輯完全不用改。

import { usePathname } from 'next/navigation'
import NavBar from './NavBar'

const HIDDEN_ON_PATHS = ['/login', '/privacy-policy', '/terms-of-service']

export default function ConditionalNavbar() {
  const pathname = usePathname()
  const shouldHide = HIDDEN_ON_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (shouldHide) return null

  return <NavBar />
}
