import './globals.css'
import type { Metadata } from 'next'
import type { Viewport } from 'next'
import ConditionalBottomNav from '@/components/ConditionalBottomNav'
import ConditionalNavbar from '@/components/ConditionalNavbar'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: '飲食管理小幫手',
  description: '結合 Notion 的個人健康與飲食追蹤工具',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ConditionalNavbar />
        {children}
        <ConditionalBottomNav />
      </body>
    </html>
  )
}
