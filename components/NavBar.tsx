'use client'

import Link from 'next/link'
import DesktopAddButton from './DesktopAddButton'

const links = [
  { href: '/profile', label: '個人資料' },
  { href: '/diet', label: '飲食紀錄' },
  { href: '/physio', label: '生理紀錄' },
  { href: '/dashboard', label: '飲食儀表板' },
  { href: '/settings', label: '設定' },
]

export default function NavBar() {
  return (
    <nav className="hidden sm:block w-full border-b bg-white sticky top-0 z-10">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
        <span className="font-bold text-lg">🥗 飲食管理小幫手</span>
        <div className="flex items-center gap-1 sm:gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              {l.label}
            </Link>
          ))}
          <DesktopAddButton />
        </div>
      </div>
    </nav>
  )
}
