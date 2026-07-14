import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { queryDatabase, createDatabasePage, updatePageProperties, trashPage, verifyPageOwnership, NotionApiError } from '@/lib/notion/client'
import { notionPageToPhysioRecord as notionPageToRecord, formValuesToPhysioProperties as formValuesToNotionProperties } from '@/lib/notion/physioMapper'
import { cachedQueryDatabase, invalidateDatabaseCache } from '@/lib/notion/queryCache'

async function getUserAndPhysioDbId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' as const }

  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('physio_db_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection || connection.status !== 'connected' || !connection.physio_db_id) {
    return { error: 'notion_not_ready' as const }
  }

  return { userId: user.id, physioDbId: connection.physio_db_id as string }
}

function buildRecordTitle(values: Record<string, any>): string {
  if (values.recordDate) return String(values.recordDate)
  const now = new Date()
  return now.toISOString()
}

// 記錄日期曾經用中文格式(toLocaleString)存過，現已改成ISO格式，兩種格式混在一起時
// 用文字排序(Notion API的title排序)或直接new Date()比較都可能得到錯亂的順序。
// 這裡在回傳前一律用「能被正確解析的時間」重新排序，無法解析的舊格式紀錄視為最舊，排到最後面，
// 不會插隊打亂正常排序，但也不會讓程式crash。
function recordSortKey(record: any): number {
  const t = new Date(record.recordDate).getTime()
  return isNaN(t) ? -Infinity : t
}

function sortRecordsByDateDesc(records: any[]): any[] {
  return [...records].sort((a, b) => recordSortKey(b) - recordSortKey(a))
}

// GET /api/physio?days=30              舊行為：查詢近N天的生理紀錄（設定頁摘要仍用這個模式），走快取
// GET /api/physio?limit=50&cursor=xxx   新行為：分頁查詢（/physio 完整列表頁使用）
// 分頁模式改成「不走快取，每次都直接向Notion拿最新資料」，確保重新整理頁面(F5)一定看到最新紀錄，
// 不會因為短TTL快取還沒過期而顯示舊資料
export async function GET(request: Request) {
  const result = await getUserAndPhysioDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)

    if (limitParam) {
      const limit = Math.min(Number(limitParam) || 50, 100)
      const cursor = searchParams.get('cursor') || undefined

      const queryBody: Record<string, any> = {
        sorts: [{ property: '記錄日期', direction: 'descending' }],
        page_size: limit,
      }
      if (cursor) queryBody.start_cursor = cursor

      const data = await queryDatabase(accessToken, result.physioDbId, queryBody)
      const pageRecords = sortRecordsByDateDesc((data.results ?? []).map(notionPageToRecord))

      return NextResponse.json({
        records: pageRecords,
        nextCursor: data.has_more ? data.next_cursor : null,
      })
    }

    // 原本的days模式：設定頁「今天摘要」等場景繼續沿用，維持走快取
    const days = Number(searchParams.get('days') ?? 30)

    const records = await cachedQueryDatabase(
      ['db', result.physioDbId, 'physio-list', result.userId, days],
      async () => {
        const sinceDate = new Date()
        sinceDate.setUTCDate(sinceDate.getUTCDate() - days)

        let allRecords: any[] = []
        let cursor: string | undefined = undefined
        let hasMore = true
        let pageCount = 0

        while (hasMore && pageCount < 10) {
          const queryBody: Record<string, any> = {
            sorts: [{ property: '記錄日期', direction: 'descending' }],
            page_size: 100,
          }
          if (cursor) queryBody.start_cursor = cursor

          const data = await queryDatabase(accessToken, result.physioDbId, queryBody)
          const pageRecords = (data.results ?? []).map(notionPageToRecord)
          allRecords = allRecords.concat(pageRecords)

          const oldest = pageRecords[pageRecords.length - 1]
          const oldestTime = oldest ? new Date(oldest.recordDate).getTime() : NaN
          hasMore = data.has_more && !isNaN(oldestTime) && oldestTime > sinceDate.getTime()
          cursor = data.next_cursor
          pageCount++
        }

        return sortRecordsByDateDesc(
          allRecords.filter((r) => {
            const t = new Date(r.recordDate).getTime()
            return !isNaN(t) && t > sinceDate.getTime()
          })
        )
      }
    )

    return NextResponse.json({ records })
  } catch (e) {
    return handleApiError(e, 'query_failed')
  }
}

// POST：新增一筆生理紀錄，成功後清除快取
export async function POST(request: Request) {
  const result = await getUserAndPhysioDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const body = await request.json()

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)
    const recordTitle = buildRecordTitle(body)
    const properties = formValuesToNotionProperties(body, recordTitle)
    const page = await createDatabasePage(accessToken, result.physioDbId, properties)

    invalidateDatabaseCache(result.physioDbId)

    return NextResponse.json({ record: notionPageToRecord(page) })
  } catch (e) {
    return handleApiError(e, 'query_failed')
  }
}

// PUT：更新既有生理紀錄（body需帶pageId），成功後清除快取
export async function PUT(request: Request) {
  const result = await getUserAndPhysioDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const body = await request.json()
  const { pageId, ...values } = body

  if (!pageId) {
    return NextResponse.json({ error: 'missing_page_id' }, { status: 400 })
  }

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)

    await verifyPageOwnership(accessToken, result.userId, pageId, 'physio')

    const recordTitle = buildRecordTitle(values)
    const properties = formValuesToNotionProperties(values, recordTitle)
    const page = await updatePageProperties(accessToken, pageId, properties, result.userId)

    invalidateDatabaseCache(result.physioDbId)

    return NextResponse.json({ record: notionPageToRecord(page) })
  } catch (e) {
    return handleApiError(e, 'query_failed')
  }
}

// DELETE：刪除生理紀錄（query參數帶pageId），成功後清除快取
export async function DELETE(request: Request) {
  const result = await getUserAndPhysioDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const { searchParams } = new URL(request.url)
  const pageId = searchParams.get('pageId')

  if (!pageId) {
    return NextResponse.json({ error: 'missing_page_id' }, { status: 400 })
  }

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)

    await verifyPageOwnership(accessToken, result.userId, pageId, 'physio')

    await trashPage(accessToken, pageId, result.userId)

    invalidateDatabaseCache(result.physioDbId)

    return NextResponse.json({ success: true })
  } catch (e) {
    return handleApiError(e, 'query_failed')
  }
}
