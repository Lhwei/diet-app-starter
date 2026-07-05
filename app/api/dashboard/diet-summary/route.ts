import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { queryDatabase, NotionApiError } from '@/lib/notion/client'
import { notionPageToRecord } from '@/lib/notion/dietMapper'

// GET /api/dashboard/diet-summary?days=14
// 為儀表板彙整用：抓取最近 N 天的飲食紀錄（自動處理 Notion 分頁，一次回傳完整資料給前端做彙整計算）
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('diet_db_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection || connection.status !== 'connected' || !connection.diet_db_id) {
    return NextResponse.json({ error: 'notion_not_ready' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 365)

  const sinceDate = new Date()
  sinceDate.setUTCDate(sinceDate.getUTCDate() - days)

  try {
    const accessToken = await getValidNotionAccessToken(user.id)

    let allRecords: any[] = []
    let cursor: string | undefined = undefined
    let hasMore = true
    let pageCount = 0

    // Notion created_time 沒有 filter 可用（該 property 型態無法在 query filter 上比較），
    // 改用分頁抓取後在應用層依 createdTime 篩選，並設定安全上限避免無窮迴圈
    while (hasMore && pageCount < 30) {
      const queryBody: Record<string, any> = {
        sorts: [{ property: '記錄時間', direction: 'descending' }],
        page_size: 100,
      }
      if (cursor) queryBody.start_cursor = cursor

      const data = await queryDatabase(accessToken, connection.diet_db_id, queryBody)
      const pageRecords = (data.results ?? []).map(notionPageToRecord)
      allRecords = allRecords.concat(pageRecords)

      const oldestInPage = pageRecords[pageRecords.length - 1]
      hasMore = data.has_more && oldestInPage && new Date(oldestInPage.createdTime) > sinceDate
      cursor = data.next_cursor
      pageCount++
    }

    const filtered = allRecords.filter((r) => new Date(r.createdTime) > sinceDate)

    return NextResponse.json({ records: filtered })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'query_failed', message: String(e) }, { status: 500 })
  }
}
