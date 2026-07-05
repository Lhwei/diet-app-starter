import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { queryDatabase, updatePageProperties, NotionApiError } from '@/lib/notion/client'
import { notionPageToPhysioRecord } from '@/lib/notion/physioMapper'
import {
  bucketWeightByWeek,
  projectWeightTarget,
  breakthroughStrategies,
} from '@/lib/nutrition/weightLossProjection'
import { cachedQueryDatabase, invalidateDatabaseCache } from '@/lib/notion/queryCache'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('physio_db_id, personal_db_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection || connection.status !== 'connected' || !connection.physio_db_id || !connection.personal_db_id) {
    return NextResponse.json({ error: 'notion_not_ready' }, { status: 400 })
  }

  try {
    const accessToken = await getValidNotionAccessToken(user.id)

    const sinceDate = new Date()
    sinceDate.setUTCDate(sinceDate.getUTCDate() - 90)

    // 生理紀錄查詢走快取（90天內的紀錄，60秒內重複進儀表板不會重打API）
    const allRecords = await cachedQueryDatabase(
      ['db', connection.physio_db_id, 'weight-projection', user.id],
      async () => {
        let records: any[] = []
        let cursor: string | undefined = undefined
        let hasMore = true
        let pageCount = 0

        while (hasMore && pageCount < 10) {
          const queryBody: Record<string, any> = {
            sorts: [{ property: '記錄日期', direction: 'descending' }],
            page_size: 100,
          }
          if (cursor) queryBody.start_cursor = cursor

          const data = await queryDatabase(accessToken, connection.physio_db_id, queryBody)
          const pageRecords = (data.results ?? []).map(notionPageToPhysioRecord)
          records = records.concat(pageRecords)

          const oldest = pageRecords[pageRecords.length - 1]
          hasMore = data.has_more && oldest && new Date(oldest.createdTime) > sinceDate
          cursor = data.next_cursor
          pageCount++
        }

        return records
      }
    )

    const filtered = allRecords.filter((r: any) => new Date(r.createdTime) > sinceDate)
    const weeklyPoints = bucketWeightByWeek(filtered)

    const profileData = await cachedQueryDatabase(
      ['db', connection.personal_db_id, 'weight-projection-profile', user.id],
      () => queryDatabase(accessToken, connection.personal_db_id, { page_size: 1 })
    )
    const profilePage = profileData.results?.[0]

    if (!profilePage) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 400 })
    }

    const props = profilePage.properties
    const targetWeight = props?.['目標體重(kg)']?.number ?? null
    const latestWeightFromPhysio = weeklyPoints.length > 0 ? weeklyPoints[weeklyPoints.length - 1].avgWeight : null
    const startWeight = props?.['起始體重(kg)']?.number ?? null
    const currentWeight = latestWeightFromPhysio ?? startWeight

    if (!targetWeight || !currentWeight) {
      return NextResponse.json({
        error: 'missing_weight_data',
        debug: { targetWeight, latestWeightFromPhysio, startWeight, weeklyPointsCount: weeklyPoints.length },
      }, { status: 400 })
    }

    const projection = projectWeightTarget({ currentWeight, targetWeight, weeklyPoints })

    let writeBackError: string | null = null
    if (projection.projectedDate) {
      try {
        await updatePageProperties(accessToken, profilePage.id, {
          '目標達成日期': { date: { start: projection.projectedDate } },
        })
        // 寫入目標達成日期後，個人資料庫的內容變了，清掉快取讓下次讀取拿到最新的
        invalidateDatabaseCache(connection.personal_db_id)
      } catch (writeErr) {
        writeBackError = writeErr instanceof NotionApiError ? writeErr.message : String(writeErr)
      }
    }

    return NextResponse.json({
      currentWeight,
      targetWeight,
      projection,
      breakthroughStrategies: projection.isStalled ? breakthroughStrategies : [],
      weeklyPoints,
      writeBackError,
    })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'query_failed', message: String(e) }, { status: 500 })
  }
}
