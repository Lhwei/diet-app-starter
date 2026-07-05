import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { queryDatabase, NotionApiError } from '@/lib/notion/client'
import { notionPageToPhysioRecord } from '@/lib/notion/physioMapper'

// GET /api/dashboard/physio-summary?days=30
// 抓取最近N天生理紀錄，供趨勢分析圖表使用（沿用飲食摘要API相同的分頁抓取邏輯）
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('physio_db_id, personal_db_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection || connection.status !== 'connected' || !connection.physio_db_id) {
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

    while (hasMore && pageCount < 30) {
      const queryBody: Record<string, any> = {
        sorts: [{ property: '記錄日期', direction: 'descending' }],
        page_size: 100,
      }
      if (cursor) queryBody.start_cursor = cursor

      const data = await queryDatabase(accessToken, connection.physio_db_id, queryBody)
      const pageRecords = (data.results ?? []).map(notionPageToPhysioRecord)
      allRecords = allRecords.concat(pageRecords)

      const oldestInPage = pageRecords[pageRecords.length - 1]
      hasMore = data.has_more && oldestInPage && new Date(oldestInPage.createdTime) > sinceDate
      cursor = data.next_cursor
      pageCount++
    }

    const filtered = allRecords.filter((r) => new Date(r.createdTime) > sinceDate)

    // 一併查詢個人資料的身高，供BMI計算使用
    let heightCm: number | null = null
    if (connection.personal_db_id) {
      try {
        const profileData = await queryDatabase(accessToken, connection.personal_db_id, { page_size: 1 })
        const profilePage = profileData.results?.[0]
        heightCm = profilePage?.properties?.['身高(cm)']?.number ?? null
      } catch {
        heightCm = null
      }
    }

    return NextResponse.json({ records: filtered, heightCm })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'query_failed', message: String(e) }, { status: 500 })
  }
}
