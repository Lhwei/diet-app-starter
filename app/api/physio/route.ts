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

// 「記錄日期」是Notion資料庫的title欄位，這裡統一產生一個可讀的標題字串
function buildRecordTitle(values: Record<string, any>): string {
  if (values.recordDate) return String(values.recordDate)
  const now = new Date()
  return now.toLocaleString('zh-TW', { hour12: false })
}

// GET /api/physio?days=30  查詢近N天的生理紀錄，走快取
export async function GET(request: Request) {
  const result = await getUserAndPhysioDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const { searchParams } = new URL(request.url)
  const days = Number(searchParams.get('days') ?? 30)

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)

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
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'create_failed', message: String(e) }, { status: 500 })
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
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'update_failed', message: String(e) }, { status: 500 })
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
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'delete_failed', message: String(e) }, { status: 500 })
  }
}
