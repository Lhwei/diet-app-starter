import './globals.css'
import type { Metadata } from 'next'
import type { Viewport } from 'next'
import ConditionalBottomNav from '@/components/ConditionalBottomNav'
import ConditionalNavbar from '@/components/ConditionalNavbar'
import { ThemeProvider } from '@/lib/theme/ThemeContext'
import { THEME_IDS, DEFAULT_THEME, generateThemeCss } from '@/lib/theme/themes'

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

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('diet-app-theme');
    var valid = ${JSON.stringify(THEME_IDS)};
    document.documentElement.setAttribute('data-theme', valid.includes(t) ? t : ${JSON.stringify(DEFAULT_THEME)});
  } catch (e) {
    document.documentElement.setAttribute('data-theme', ${JSON.stringify(DEFAULT_THEME)});
  }
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        {/* 依 themes.ts 動態產生每個主題的 CSS 變數，新增主題時不用回來改這裡 */}
        <style dangerouslySetInnerHTML={{ __html: generateThemeCss() }} />
        {/* 在畫面繪製前先套用已儲存的主題，避免閃爍成錯誤主題 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-background text-text-strong antialiased">
        <ThemeProvider>
          <ConditionalNavbar />
          {children}
          <ConditionalBottomNav />
        </ThemeProvider>
      </body>
    </html>
  )
}
