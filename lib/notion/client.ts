// Notion API 呼叫封裝（伺服器端專用）
// 統一處理 401 / 429 / 404 錯誤情境，符合規格文件的錯誤處理要求
//
// 本次更新：
// 1. 401 自動觸發 forceRefreshNotionToken 刷新一次並重試，而不是直接拋錯讓功能中斷
//    （呼叫端需傳入 userId，才能查到對應使用者的refresh_token去刷新）
// 2. 新增 verifyDatabaseOwnership：CRUD前先確認page_id/database_id真的屬於該使用者，
//    防止IDOR（跨使用者存取他人Notion資料）
// 3. 新增 retrieveDatabase + updateDatabaseProperties：供 patch-schema route 使用，
//    修補既有使用者資料庫缺漏的property，全程走notionFetch封裝（401刷新token重試、
//    429指數退避），不是額外開一條裸fetch繞過既有錯誤處理機制

import { forceRefreshNotionToken } from './tokenManager'
import { createServiceRoleClient } from '@/lib/supabase/server'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

export class NotionApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface NotionFetchOptions extends RequestInit {
  // 傳入userId才能在401時自動刷新token重試；不傳則401直接拋錯（例如初次OAuth流程還沒有存token時）
  userId?: string
}

async function notionFetch(
  accessToken: string,
  path: string,
  options: NotionFetchOptions = {},
  retryCount = 0,
  hasRetriedAuth = false
): Promise<any> {
  const { userId, ...fetchOptions } = options

  const res = await fetch(`${NOTION_API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    },
  })

  // 429：遵守 Retry-After 標頭，指數退避重試（最多重試 3 次）
  if (res.status === 429 && retryCount < 3) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '1', 10)
    const backoffMs = Math.max(retryAfter * 1000, 2 ** retryCount * 500)
    await new Promise((resolve) => setTimeout(resolve, backoffMs))
    return notionFetch(accessToken, path, options, retryCount + 1, hasRetriedAuth)
  }

  // 401：token失效。若有userId且尚未重試過，先刷新token再重試一次；
  // 若沒有userId或已經重試過仍401，才真的拋錯讓上層導向重新授權
  if (res.status === 401) {
    if (userId && !hasRetriedAuth) {
      const newAccessToken = await forceRefreshNotionToken(userId)
      return notionFetch(newAccessToken, path, options, retryCount, true)
    }
    throw new NotionApiError('notion_token_invalid', 401)
  }

  if (res.status === 404) {
    throw new NotionApiError('Notion 資源不存在，可能已被使用者移除分享或刪除', 404)
  }

  if (!res.ok) {
    const body = await res.text()
    throw new NotionApiError(`Notion API error ${res.status}: ${body}`, res.status)
  }

  return res.json()
}

// ============================================
// IDOR防護：CRUD操作前，先確認目標page_id真的屬於該使用者記錄的database_id
// 規格5要求：「伺服器端必須驗證目標page_id所屬的database_id，
// 是否等於該使用者資料表中記錄的『生理紀錄』或『飲食紀錄』database_id」
// ============================================

// 呼叫Notion API取得page所屬的database_id，再跟Supabase裡記錄的該使用者database_id比對
export async function verifyPageOwnership(
  accessToken: string,
  userId: string,
  pageId: string,
  expectedDbType: 'diet' | 'physio'
): Promise<void> {
  const supabase = createServiceRoleClient()
  const dbColumn = expectedDbType === 'diet' ? 'diet_db_id' : 'physio_db_id'

  const { data: connection } = await supabase
    .from('notion_connections')
    .select(dbColumn)
    .eq('user_id', userId)
    .maybeSingle()

  const expectedDbId = (connection as any)?.[dbColumn]
  if (!expectedDbId) {
    throw new NotionApiError('notion_not_ready', 400)
  }

  const page = await retrievePage(accessToken, pageId)
  const actualDbId = page?.parent?.database_id

  // 這裡刻意用嚴格字串比對（去除破折號的normalize），避免Notion ID格式帶不帶dash造成誤判
  const normalize = (id: string) => id?.replace(/-/g, '')

  if (!actualDbId || normalize(actualDbId) !== normalize(expectedDbId)) {
    // 不透露內部細節（例如實際的database_id是什麼），只回一個通用拒絕訊息
    throw new NotionApiError('forbidden_resource_access', 403)
  }
}

export function createPage(
  accessToken: string,
  parentPageId: string,
  title: string,
  userId?: string
) {
  return notionFetch(accessToken, '/pages', {
    method: 'POST',
    userId,
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: {
        title: { title: [{ text: { content: title } }] },
      },
    }),
  })
}

export function createDatabase(
  accessToken: string,
  parentPageId: string,
  title: string,
  properties: Record<string, any>,
  userId?: string
) {
  return notionFetch(accessToken, '/databases', {
    method: 'POST',
    userId,
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ text: { content: title } }],
      properties,
    }),
  })
}

// 取得使用者在授權時選取的父層頁面（Notion Search API，僅回傳授權範圍內的頁面）
export function searchAccessiblePages(accessToken: string, userId?: string) {
  return notionFetch(accessToken, '/search', {
    method: 'POST',
    userId,
    body: JSON.stringify({
      filter: { property: 'object', value: 'page' },
      page_size: 10,
    }),
  })
}

// 移至垃圾桶（軟刪除），對應規格文件「刪除＝移至 Notion 垃圾桶」
export function trashPage(accessToken: string, pageId: string, userId?: string) {
  return notionFetch(accessToken, `/pages/${pageId}`, {
    method: 'PATCH',
    userId,
    body: JSON.stringify({ in_trash: true }),
  })
}

export function queryDatabase(
  accessToken: string,
  databaseId: string,
  body: Record<string, any> = {},
  userId?: string
) {
  return notionFetch(accessToken, `/databases/${databaseId}/query`, {
    method: 'POST',
    userId,
    body: JSON.stringify(body),
  })
}

export function createDatabasePage(
  accessToken: string,
  databaseId: string,
  properties: Record<string, any>,
  userId?: string
) {
  return notionFetch(accessToken, '/pages', {
    method: 'POST',
    userId,
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  })
}

export function updatePageProperties(
  accessToken: string,
  pageId: string,
  properties: Record<string, any>,
  userId?: string
) {
  return notionFetch(accessToken, `/pages/${pageId}`, {
    method: 'PATCH',
    userId,
    body: JSON.stringify({ properties }),
  })
}

export function retrievePage(accessToken: string, pageId: string, userId?: string) {
  return notionFetch(accessToken, `/pages/${pageId}`, { userId })
}

export function appendBlockChildren(
  accessToken: string,
  blockId: string,
  children: Record<string, any>[],
  userId?: string
) {
  return notionFetch(accessToken, `/blocks/${blockId}/children`, {
    method: 'PATCH',
    userId,
    body: JSON.stringify({ children }),
  })
}


export function retrieveDatabase(accessToken: string, databaseId: string, userId?: string) {
  return notionFetch(accessToken, `/databases/${databaseId}`, { userId })
}

// 修補既有資料庫的 property 定義（PATCH /v1/databases/{id}）
// 用於 app/api/notion/patch-schema/route.ts：只新增schema裡缺的property，
// 不會動到已存在的欄位或使用者已填的資料（Notion API的PATCH properties是merge語意，
// 傳入的property名稱若已存在會被覆蓋定義，若不存在則新增；這裡呼叫端已先比對過
// 只傳「目前資料庫沒有的」property，不會誤蓋到既有欄位設定）
export function updateDatabaseProperties(
  accessToken: string,
  databaseId: string,
  properties: Record<string, any>,
  userId?: string
) {
  return notionFetch(accessToken, `/databases/${databaseId}`, {
    method: 'PATCH',
    userId,
    body: JSON.stringify({ properties }),
  })
}
