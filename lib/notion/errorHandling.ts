// lib/notion/client.ts 的401處理範例
// 這個檔案示範如何在NotionApiError發生401時，自動觸發forceRefreshNotionToken重試一次
// 隊長需要把這個邏輯整合進現有的queryDatabase/createDatabasePage等函式呼叫處

import { forceRefreshNotionToken } from './tokenManager'

export class NotionApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// 包一層：自動處理401重試（刷新token後再試一次），429則做指數退避重試
export async function callNotionApiWithRetry(
  userId: string,
  accessToken: string,
  makeRequest: (token: string) => Promise<Response>,
  retriesLeft = 3
): Promise<Response> {
  const response = await makeRequest(accessToken)

  if (response.status === 401) {
    // token失效，嘗試刷新一次（forceRefreshNotionToken內建in-flight去重複）
    const newToken = await forceRefreshNotionToken(userId)
    const retryResponse = await makeRequest(newToken)
    if (!retryResponse.ok) {
      throw new NotionApiError('notion_unauthorized_after_refresh', retryResponse.status)
    }
    return retryResponse
  }

  if (response.status === 429 && retriesLeft > 0) {
    const retryAfterHeader = response.headers.get('Retry-After')
    const waitMs = retryAfterHeader
      ? Number(retryAfterHeader) * 1000
      : (4 - retriesLeft) * 1000 // 指數退避：1秒、2秒、3秒

    await new Promise((resolve) => setTimeout(resolve, waitMs))
    return callNotionApiWithRetry(userId, accessToken, makeRequest, retriesLeft - 1)
  }

  if (response.status === 404) {
    // 資源可能已被使用者在Notion端移除分享或刪除，優雅降級，不當成一般錯誤拋出
    throw new NotionApiError('notion_resource_not_found', 404)
  }

  if (!response.ok) {
    throw new NotionApiError('notion_request_failed', response.status)
  }

  return response
}
