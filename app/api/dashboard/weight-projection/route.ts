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
import { handleApiError } from '@/lib/api/errorResponse'

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
          // 改用「記錄日期」(recordDate) 判斷是否已經超出90天範圍，不再用 createdTime。
          // 記錄日期現在可能被手動改成過去的日期（補登舊報告），createdTime跟記錄日期會脫鉤，
          // 用 createdTime 篩選會錯誤納入/排除紀錄，導致週平均算出從未真正填寫過的數字。
          const oldestDate = oldest ? new Date(oldest.recordDate) : null
          hasMore = data.has_more && oldestDate !== null && !isNaN(oldestDate.getTime()) && oldestDate > sinceDate
          cursor = data.next_cursor
          pageCount++
        }

        return records
      }
    )

    const filtered = allRecords.filter((r: any) => {
      const d = new Date(r.recordDate)
      return !isNaN(d.getTime()) && d > sinceDate
    })
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
    // 直接取「記錄日期最新」那一筆的原始體重數字，不用任何平均值，
    // 避免使用者在畫面上看到一個自己從未真正填寫過的計算結果
    const latestRecordWithWeight = [...filtered]
      .filter((r: any) => r.weight !== undefined && r.weight !== null)
      .sort((a: any, b: any) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())[0]
    const latestWeightFromPhysio = latestRecordWithWeight?.weight ?? null
    const startWeight = props?.['起始體重(kg)']?.number ?? null
    const currentWeight = latestWeightFromPhysio ?? startWeight

    if (!targetWeight || !currentWeight) {
      return NextResponse.json({
        error: 'missing_weight_data',
      }, { status: 400 })
    }

    const projection = projectWeightTarget({ currentWeight, targetWeight, weeklyPoints })

    let writeBackError: string | null = null
    if (projection.projectedDate) {
      try {
        await updatePageProperties(accessToken, profilePage.id, {
          '目標達成日期': { date: { start: projection.projectedDate } },
        })
        invalidateDatabaseCache(connection.personal_db_id)
      } catch (writeErr) {
        console.error('[weight-projection] 寫回目標日期失敗:', writeErr)
        writeBackError = 'write_back_failed'
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
    return handleApiError(e, 'query_failed')
  }
}
