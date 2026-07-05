import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshNotionToken } from '@/lib/notion/oauth'

// 併發安全的 Token 刷新機制
//
// 問題背景：
// Notion 的 refresh_token 是「一次性」的——每次成功刷新後，Notion 會回傳一組新的
// access_token + refresh_token，而「舊的」refresh_token 立刻失效。
// 如果同一個使用者在短時間內觸發多個需要刷新 token 的請求（例如兩個 tab 同時操作），
// 第一個請求刷新成功後，第二個請求若還拿著「舊的」refresh_token 去刷新，
// Notion 會回應 invalid_grant 錯誤，導致該次請求失敗。
//
// 解法：single-flight 鎖 —— 用資料庫欄位當作鎖，確保同一個使用者同時只有一個刷新請求在執行，
// 其他請求等待鎖釋放後，直接讀取已經刷新好的最新 token，不重複呼叫 Notion。

const LOCK_TTL_MS = 15_000 // 鎖的存活時間，避免刷新請求卡死導致永久鎖住
const POLL_INTERVAL_MS = 300
const MAX_WAIT_MS = 10_000

export async function getValidNotionAccessToken(userId: string): Promise<string> {
  const admin = createServiceRoleClient()

  const { data: connection, error } = await admin
    .from('notion_connections')
    .select('access_token, refresh_token, refreshing_since')
    .eq('user_id', userId)
    .single()

  if (error || !connection) {
    throw new Error('notion_connection_not_found')
  }

  const now = Date.now()
  const lockActive =
    connection.refreshing_since &&
    now - new Date(connection.refreshing_since).getTime() < LOCK_TTL_MS

  if (lockActive) {
    // 已經有另一個請求在刷新，等待它完成後直接讀取最新 token
    return await waitForRefreshedToken(userId)
  }

  // 嘗試取得刷新鎖：用「原本沒有鎖」當作 WHERE 條件，確保同時只有一個請求能搶到鎖
  const { data: lockRow, error: lockError } = await admin
    .from('notion_connections')
    .update({ refreshing_since: new Date().toISOString() })
    .eq('user_id', userId)
    .is('refreshing_since', null)
    .select()
    .maybeSingle()

  if (lockError) {
    throw new Error('failed_to_acquire_refresh_lock')
  }

  if (!lockRow) {
    // 沒搶到鎖，代表剛好有其他請求同時搶先一步，等待它完成
    return await waitForRefreshedToken(userId)
  }

  // 搶到鎖，執行實際的刷新
  try {
    const tokenData = await refreshNotionToken(connection.refresh_token)

    // 整組覆蓋更新 access_token / refresh_token，並釋放鎖
    await admin
      .from('notion_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? connection.refresh_token,
        refreshing_since: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return tokenData.access_token
  } catch (e) {
    // 刷新失敗（refresh_token 真的失效了）：釋放鎖，標記需要重新授權
    await admin
      .from('notion_connections')
      .update({ refreshing_since: null, status: 'revoked' })
      .eq('user_id', userId)
    throw new Error('notion_refresh_failed_needs_reauth')
  }
}

async function waitForRefreshedToken(userId: string): Promise<string> {
  const admin = createServiceRoleClient()
  const start = Date.now()

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

    const { data: connection } = await admin
      .from('notion_connections')
      .select('access_token, refreshing_since, status')
      .eq('user_id', userId)
      .single()

    if (connection?.status === 'revoked') {
      throw new Error('notion_refresh_failed_needs_reauth')
    }

    if (!connection?.refreshing_since) {
      return connection!.access_token
    }
  }

  throw new Error('notion_refresh_timeout')
}
