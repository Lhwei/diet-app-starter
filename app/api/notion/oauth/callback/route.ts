import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeNotionCode } from '@/lib/notion/oauth'

// 這個 route 對應 Notion Integration 設定裡填的 Redirect URI：
// http://localhost:3000/api/notion/oauth/callback
// 正式站要記得在 Notion Integration 設定裡再加一組正式網域的版本
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error') // 使用者在 Notion 授權畫面按「取消」時會帶這個

  // 1. 使用者拒絕授權的情況，優雅處理，不要顯示原始錯誤
  if (errorParam) {
    return NextResponse.redirect(`${origin}/settings?notion_error=user_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings?notion_error=missing_params`)
  }

  // 2. 確認目前有登入的 Supabase 使用者（callback 必須在已登入狀態下發生）
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?redirect=/settings`)
  }

  const admin = createServiceRoleClient()

  // 3. 驗證 state：必須存在、屬於目前使用者、未過期、未被使用過（防 CSRF / replay）
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

  // 4. 立即標記該 state 已使用，避免同一組 code/state 被重複兌換
  await admin
    .from('oauth_states')
    .update({ used_at: new Date().toISOString() })
    .eq('state', state)

  // 5. 用 code 向 Notion 換 access_token / refresh_token（僅在伺服器端進行）
  try {
    const tokenData = await exchangeNotionCode(code)

    // 6. 整組覆蓋寫入，之後刷新 token 時也必須整組覆蓋，不可只更新 access_token
    const { error: upsertError } = await admin
      .from('notion_connections')
      .upsert(
        {
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token ?? null,
          bot_id: tokenData.bot_id,
          workspace_id: tokenData.workspace_id,
          workspace_name: tokenData.workspace_name,
          duplicated_template_id: tokenData.duplicated_template_id ?? null,
          status: 'connected',
          init_step: 'pending', // 下一步交給 /api/notion/init 建立 4 個物件
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      return NextResponse.redirect(`${origin}/settings?notion_error=save_failed`)
    }

    return NextResponse.redirect(`${origin}/settings?notion=connected`)
  } catch (e) {
    return NextResponse.redirect(`${origin}/settings?notion_error=token_exchange_failed`)
  }
}
