import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateState, buildNotionAuthorizeUrl } from '@/lib/notion/oauth'

// 產生 state，與目前登入使用者的 user_id 綁定，存入 Supabase 的 TTL 表
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL))
  }

  const state = generateState()
  const admin = createServiceRoleClient()

  // oauth_states 表需有 TTL / 定期清理機制，見 supabase/schema.sql
  const { error } = await admin.from('oauth_states').insert({
    state,
    user_id: user.id,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 分鐘有效
  })

  if (error) {
    return NextResponse.json({ error: 'failed_to_create_state' }, { status: 500 })
  }

  return NextResponse.redirect(buildNotionAuthorizeUrl(state))
}
