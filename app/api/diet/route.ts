import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { queryDatabase, createDatabasePage, updatePageProperties, trashPage, verifyPageOwnership, NotionApiError } from '@/lib/notion/client'
import { notionPageToRecord, formValuesToNotionProperties } from '@/lib/notion/dietMapper'
import { cachedQueryDatabase, invalidateDatabaseCache } from '@/lib/notion/queryCache'

async function getUserAndDietDbId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' as const }

  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('diet_db_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection || connection.status !== 'connected' || !connection.diet_db_id) {
    return { error: 'notion_not_ready' as const }
  }

  return { userId: user.id, dietDbId: connection.diet_db_id as string }
}

// 「記錄時間」是Notion資料庫的title欄位，這裡統一產生一個可讀的標題字串
// 若前端有帶 recordTitle 就直接使用，否則用目前時間當標題
function buildRecordTitle(values: Record<string, any>): string {
  if (values.recordTitle) return String(values.recordTitle)
  const now = new Date()
  return now.toLocaleString('zh-TW', { hour12: false })
}

// GET /api/diet?days=30  查詢近N天的飲食紀錄，走快取（60秒內同樣的days參數重複查詢不重打Notion API）
export async function GET(request: Request) {
  const result = await getUserAndDietDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const { searchParams } = new URL(request.url)
  const days = Number(searchParams.get('days') ?? 30)

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)

    const records = await cachedQueryDatabase(
      ['db', result.dietDbId, 'diet-list', result.userId, days],
      async () => {
        const sinceDate = new Date()
        sinceDate.setUTCDate(sinceDate.getUTCDate() - days)

        let allRecords: any[] = []
        let cursor: string | undefined = undefined
        let hasMore = true
        let pageCount = 0

        while (hasMore && pageCount < 10) {
          const queryBody: Record<string, any> = {
            sorts: [{ property: '記錄時間', direction: 'descending' }],
            page_size: 100,
          }
          if (cursor) queryBody.start_cursor = cursor

          const data = await queryDatabase(accessToken, result.dietDbId, queryBody)
          const pageRecords = (data.results ?? []).map(notionPageToRecord)
          allRecords = allRecords.concat(pageRecords)

          const oldest = pageRecords[pageRecords.length - 1]
          hasMore = data.has_more && oldest && new Date(oldest.createdTime) > sinceDate
          cursor = data.next_cursor
          pageCount++
        }

        return allRecords.filter((r) => new Date(r.createdTime) > sinceDate)
      }
    )

    return NextResponse.json({ records })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'query_failed', message: String(e) }, { status: 500 })
  }
}

// POST：新增一筆飲食紀錄，成功後清除該資料庫的快取，確保下一次GET拿到最新清單
export async function POST(request: Request) {
  const result = await getUserAndDietDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const body = await request.json()

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)
    const recordTitle = buildRecordTitle(body)
    const properties = formValuesToNotionProperties(body, recordTitle)
    const page = await createDatabasePage(accessToken, result.dietDbId, properties)

    invalidateDatabaseCache(result.dietDbId)

    return NextResponse.json({ record: notionPageToRecord(page) })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'create_failed', message: String(e) }, { status: 500 })
  }
}

// PUT：更新既有飲食紀錄（body需帶pageId），成功後清除快取
export async function PUT(request: Request) {
  const result = await getUserAndDietDbId()
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

    // IDOR防護：確認這個pageId真的屬於該使用者記錄的飲食紀錄資料庫，不符合直接拒絕
    await verifyPageOwnership(accessToken, result.userId, pageId, 'diet')

    const recordTitle = buildRecordTitle(values)
    const properties = formValuesToNotionProperties(values, recordTitle)
    const page = await updatePageProperties(accessToken, pageId, properties, result.userId)

    invalidateDatabaseCache(result.dietDbId)

    return NextResponse.json({ record: notionPageToRecord(page) })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'update_failed', message: String(e) }, { status: 500 })
  }
}

// DELETE：刪除飲食紀錄（query參數帶pageId），成功後清除快取
export async function DELETE(request: Request) {
  const result = await getUserAndDietDbId()
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

    // IDOR防護：確認這個pageId真的屬於該使用者記錄的飲食紀錄資料庫，不符合直接拒絕
    await verifyPageOwnership(accessToken, result.userId, pageId, 'diet')

    await trashPage(accessToken, pageId, result.userId)

    invalidateDatabaseCache(result.dietDbId)

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'delete_failed', message: String(e) }, { status: 500 })
  }
}
