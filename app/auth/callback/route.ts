import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Google OAuth 完成後 Supabase 導回此 route，交換 code 換 session
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 登入成功後導向首頁，首頁會檢查 Notion 授權狀態
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
