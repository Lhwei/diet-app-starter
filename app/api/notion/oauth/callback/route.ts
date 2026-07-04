import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeNotionCode } from '@/lib/notion/oauth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !code || !state) {
    return NextResponse.redirect(`${origin}/settings?notion_error=missing_params`)
  }

  const admin = createServiceRoleClient()

  // 驗證 state：存在、未過期、未使用過、屬於目前使用者
  const { data: stateRow, error: stateError } = await admin
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .eq('user_id', user.id)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .single()

  if (stateError || !stateRow) {
    return NextResponse.redirect(`${origin}/settings?notion_error=invalid_state`)
  }

  // 標記已使用，防止 replay
  await admin.from('oauth_states').update({ used_at: new Date().toISOString() }).eq('state', state)

  try {
    const tokenData = await exchangeNotionCode(code)

    // 整組覆蓋 access_token / refresh_token / workspace 資訊
    await admin.from('notion_connections').upsert({
      user_id: user.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      bot_id: tokenData.bot_id,
      workspace_id: tokenData.workspace_id,
      workspace_name: tokenData.workspace_name,
      duplicated_template_id: tokenData.duplicated_template_id ?? null,
      status: 'connected',
      init_step: 'pending', // 交給後續 /api/notion/init 建立頁面/資料庫
    }, { onConflict: 'user_id' })

    return NextResponse.redirect(`${origin}/settings?notion=connected`)
  } catch (e) {
    return NextResponse.redirect(`${origin}/settings?notion_error=token_exchange_failed`)
  }
}
