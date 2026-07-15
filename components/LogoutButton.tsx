'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="rounded-xl border border-border px-5 py-2.5 font-medium text-text-body hover:bg-background transition disabled:opacity-50"
    >
      {isLoggingOut ? '登出中...' : '登出帳號'}
    </button>
  )
}
