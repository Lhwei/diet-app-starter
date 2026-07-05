import Link from 'next/link'

// 側邊導覽 — 使用next/link而不是純onClick+router.push
// <Link>預設會在連結進入可視範圍時自動prefetch該路由的資料，
// 使用者實際點擊時，資料多半已經在背景載入好了，切頁感覺是瞬間完成的

export default function SideNav() {
  const navItems = [
    { href: '/dashboard', label: '儀表板' },
    { href: '/profile', label: '個人資料' },
    { href: '/diet', label: '飲食紀錄' },
    { href: '/physio', label: '生理紀錄' },
  ]

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={true}
          className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
