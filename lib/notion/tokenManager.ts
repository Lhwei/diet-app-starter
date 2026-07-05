// Notion Token 管理 — 讀寫都透過 Supabase Vault 加密存放
//
// 資安要求對照：
// - access_token / refresh_token 絕不明文存入資料庫（規格7）
// - 解密後的明文只能存在伺服器記憶體中臨時使用，用完即棄，不快取明文、不回傳前端、不寫log（規格7）
// - 每次刷新後access_token跟refresh_token要整組覆蓋更新，不可只更新access_token（規格3）
// - 需處理併發刷新，避免用到已輪替失效的舊refresh_token（規格3）

import { createServiceRoleClient } from '@/lib/supabase/server'

interface NotionTokenPair {
  accessToken: string
  refreshToken: string
}

// 進行中的刷新請求快取：同一個使用者短時間內多個請求同時觸發刷新時，
// 讓後面的請求等待第一個刷新完成，直接共用結果，而不是各自拿舊refresh_token去刷新
// （避免其中一個用到已經被輪替失效的refresh_token而報invalid_grant）
const refreshInFlight = new Map<string, Promise<NotionTokenPair>>()

// 讀取目前存放的token（已解密），只能在伺服器端呼叫
async function getStoredTokens(userId: string): Promise<NotionTokenPair | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc('get_notion_tokens', { p_user_id: userId })

  if (error || !data || data.length === 0) return null

  const row = data[0]
  if (!row.access_token || !row.refresh_token) return null

  return { accessToken: row.access_token, refreshToken: row.refresh_token }
}

// 寫入/更新token（自動加密），呼叫vault function
async function storeTokens(userId: string, tokens: NotionTokenPair): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.rpc('set_notion_tokens', {
    p_user_id: userId,
    p_access_token: tokens.accessToken,
    p_refresh_token: tokens.refreshToken,
  })

  if (error) {
    // 絕對不可以把tokens的內容印進錯誤訊息或log
    throw new Error('token_storage_failed')
  }
}

async function refreshNotionToken(refreshToken: string): Promise<NotionTokenPair> {
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(
        `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    // 不可把回應內容整個log出來（可能含錯誤細節），只記錄狀態碼
    throw new Error(`notion_refresh_failed_${response.status}`)
  }

  const data = await response.json()

  // Notion每次刷新都會回傳新的access_token跟refresh_token（refresh_token會輪替失效）
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  }
}

// 取得可用的Notion access token：若尚未過期直接回傳，過期則自動刷新並整組覆蓋更新
// 呼叫端拿到的字串只能臨時使用於當次API呼叫，不可另外儲存
export async function getValidNotionAccessToken(userId: string): Promise<string> {
  const stored = await getStoredTokens(userId)

  if (!stored) {
    throw new Error('notion_not_connected')
  }

  // 先嘗試用現有access_token直接用（呼叫端遇到401會知道要重新走這個流程）
  // 這裡簡化為：由呼叫端在拿到401時，呼叫下面的forceRefreshToken
  return stored.accessToken
}

// 當Notion API回傳401時呼叫這個，強制刷新token
// 用Map做in-flight去重複，確保同一個使用者同時間只會有一個真正的刷新請求打出去
export async function forceRefreshNotionToken(userId: string): Promise<string> {
  const existing = refreshInFlight.get(userId)
  if (existing) {
    const result = await existing
    return result.accessToken
  }

  const refreshPromise = (async (): Promise<NotionTokenPair> => {
    const stored = await getStoredTokens(userId)
    if (!stored) throw new Error('notion_not_connected')

    const newTokens = await refreshNotionToken(stored.refreshToken)
    await storeTokens(userId, newTokens) // 整組覆蓋access+refresh，不只更新access

    return newTokens
  })()

  refreshInFlight.set(userId, refreshPromise)

  try {
    const result = await refreshPromise
    return result.accessToken
  } finally {
    refreshInFlight.delete(userId)
  }
}

// 初次OAuth授權完成後，呼叫這個寫入第一組token
export async function saveInitialNotionTokens(userId: string, tokens: NotionTokenPair): Promise<void> {
  await storeTokens(userId, tokens)
}
