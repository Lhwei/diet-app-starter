// Notion API 呼叫封裝（伺服器端專用）
// 統一處理 401 / 429 / 404 錯誤情境，符合規格文件的錯誤處理要求

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

export class NotionApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function notionFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<any> {
  const res = await fetch(`${NOTION_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  // 429：遵守 Retry-After 標頭，指數退避重試（最多重試 3 次）
  if (res.status === 429 && retryCount < 3) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '1', 10)
    const backoffMs = Math.max(retryAfter * 1000, 2 ** retryCount * 500)
    await new Promise((resolve) => setTimeout(resolve, backoffMs))
    return notionFetch(accessToken, path, options, retryCount + 1)
  }

  if (res.status === 401) {
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

export function createPage(
  accessToken: string,
  parentPageId: string,
  title: string
) {
  return notionFetch(accessToken, '/pages', {
    method: 'POST',
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
  properties: Record<string, any>
) {
  return notionFetch(accessToken, '/databases', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ text: { content: title } }],
      properties,
    }),
  })
}

// 取得使用者在授權時選取的父層頁面（Notion Search API，僅回傳授權範圍內的頁面）
export function searchAccessiblePages(accessToken: string) {
  return notionFetch(accessToken, '/search', {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: 'object', value: 'page' },
      page_size: 10,
    }),
  })
}

// 移至垃圾桶（軟刪除），對應規格文件「刪除＝移至 Notion 垃圾桶」
export function trashPage(accessToken: string, pageId: string) {
  return notionFetch(accessToken, `/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ in_trash: true }),
  })
}


export function queryDatabase(
  accessToken: string,
  databaseId: string,
  body: Record<string, any> = {}
) {
  return notionFetch(accessToken, `/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createDatabasePage(
  accessToken: string,
  databaseId: string,
  properties: Record<string, any>
) {
  return notionFetch(accessToken, '/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  })
}

export function updatePageProperties(
  accessToken: string,
  pageId: string,
  properties: Record<string, any>
) {
  return notionFetch(accessToken, `/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  })
}

export function retrievePage(accessToken: string, pageId: string) {
  return notionFetch(accessToken, `/pages/${pageId}`)
}
