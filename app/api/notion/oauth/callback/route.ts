import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeNotionCode } from '@/lib/notion/oauth'
import { saveInitialNotionTokens } from '@/lib/notion/tokenManager'

// 這個route對應Notion Integration設定裡填的Redirect URI：
// http://localhost:3000/api/notion/oauth/callback
// 正式站要記得在Notion Integration設定裡再加一組正式網域的版本
//
// 本次修正（根本bug，執行順序問題）：
// set_notion_tokens這個RPC內部邏輯是：
//   1. SELECT access_token_key_id/refresh_token_key_id FROM notion_connections WHERE user_id=...
//   2. 若為NULL就vault.create_secret建立新密鑰
//   3. UPDATE notion_connections SET access_token_key_id=... WHERE user_id=...
// 原本這裡的呼叫順序是「先saveInitialNotionTokens，再upsert notion_connections」，
// 導致第一次授權時，步驟1執行的當下notion_connections裡還沒有這個user_id的資料列，
// 步驟3的UPDATE因此靜默更新0筆（Postgres對UPDATE找不到符合條件的列不會報錯），
// key_id永遠沒有被寫回notion_connections。
// 使用者重試授權時，步驟1的SELECT再次找到NULL，又嘗試vault.create_secret，
// 用同樣的description二次建立密鑰，撞上Vault底層unique constraint而丟出例外，
// 導致saveInitialNotionTokens拋出token_storage_failed。
//
// 修正：把「upsert notion_connections」移到「saveInitialNotionTokens」之前，
// 確保set_notion_tokens執行時，該使用者的資料列已經存在，UPDATE才能真正生效。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error') // 使用者在Notion授權畫面按「取消」時會帶這個

  if (errorParam) {
    return NextResponse.redirect(`${origin}/settings?notion_error=user_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings?notion_error=missing_params`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?redirect=/settings`)
  }

  const admin = createServiceRoleClient()

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

  await admin
    .from('oauth_states')
    .update({ used_at: new Date().toISOString() })
    .eq('state', state)

  try {
    const tokenData = await exchangeNotionCode(code)

    if (!tokenData.refresh_token) {
      console.error('[notion-oauth-callback] 未取得refresh_token，中止流程')
      return NextResponse.redirect(`${origin}/settings?notion_error=token_exchange_failed`)
    }

    // 1. 先upsert notion_connections的metadata，確保這個user_id的資料列先存在，
    //    這樣set_notion_tokens內部的SELECT/UPDATE才能正確對應到同一列，
    //    不會因為列不存在導致UPDATE靜默失敗、key_id永遠沒被記錄回去
    const { error: upsertError } = await admin
      .from('notion_connections')
      .upsert(
        {
          user_id: user.id,
          bot_id: tokenData.bot_id,
          workspace_id: tokenData.workspace_id,
          workspace_name: tokenData.workspace_name,
          duplicated_template_id: tokenData.duplicated_template_id ?? null,
          status: 'connected',
          init_step: 'pending', // 下一步交給/api/notion/init建立4個物件
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('[notion-oauth-callback] notion_connections寫入失敗:', upsertError)
      return NextResponse.redirect(`${origin}/settings?notion_error=save_failed`)
    }

    // 2. 資料列已存在，這時才呼叫set_notion_tokens，
    //    內部的SELECT會找到這一列（key_id目前為NULL），CREATE密鑰後的UPDATE才能真正生效
    await saveInitialNotionTokens(user.id, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    })

    return NextResponse.redirect(`${origin}/settings?notion=connected`)
  } catch (e) {
    console.error('[notion-oauth-callback] token交換或Vault寫入失敗:', e instanceof Error ? e.message : e)
    return NextResponse.redirect(`${origin}/settings?notion_error=token_exchange_failed`)
  }
}
