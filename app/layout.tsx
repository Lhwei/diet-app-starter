import './globals.css'
import type { Metadata } from 'next'
import MobileBottomNav from '@/components/MobileBottomNav'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: '飲食管理小幫手',
  description: '結合 Notion 的個人健康與飲食追蹤工具',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <NavBar />
      <body className="bg-gray-50 text-gray-900 antialiased pb-20">{children}</body>
      <MobileBottomNav />
    </html>
  )
}
