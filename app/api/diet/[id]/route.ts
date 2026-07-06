import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { retrievePage, updatePageProperties, trashPage, verifyPageOwnership, NotionApiError } from '@/lib/notion/client'
import { formValuesToNotionProperties, notionPageToRecord } from '@/lib/notion/dietMapper'
import { invalidateDatabaseCache } from '@/lib/notion/queryCache'

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

// 「記錄日期」是真正的Date類型欄位，供 /api/diet?date=YYYY-MM-DD 篩選查詢使用。
// 編輯時：若前端有把既有的recordDate(ISO字串，來自notionPageToRecord)原封不動傳回來，就沿用原本日期，
// 不會因為使用者「編輯」一筆舊紀錄而讓它的日期被誤改成今天。
function buildRecordDateISO(values: Record<string, any>): string {
  if (values.recordDate) return String(values.recordDate)
  return new Date().toISOString()
}

// GET /api/diet/[id] — 查詢單筆紀錄詳情
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getUserAndDietDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const { id } = await params

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)

    // IDOR防護：確認這個pageId真的屬於該使用者記錄的飲食紀錄資料庫，不符合直接拒絕
    await verifyPageOwnership(accessToken, result.userId, id, 'diet')

    const page = await retrievePage(accessToken, id)
    return NextResponse.json({ record: notionPageToRecord(page) })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'fetch_failed', message: String(e) }, { status: 500 })
  }
}

// PATCH /api/diet/[id] — 修改紀錄
// 補齊：IDOR防護、記錄日期同步寫入、更新後清除快取（原版本這三項都缺）
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getUserAndDietDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const { id } = await params
  const body = await request.json()
  const recordTitle = body.recordTitle

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)

    // IDOR防護：確認這個pageId真的屬於該使用者記錄的飲食紀錄資料庫，不符合直接拒絕
    await verifyPageOwnership(accessToken, result.userId, id, 'diet')

    const recordDateISO = buildRecordDateISO(body)
    const properties = formValuesToNotionProperties(body, recordTitle, recordDateISO)
    const page = await updatePageProperties(accessToken, id, properties, result.userId)

    invalidateDatabaseCache(result.dietDbId)

    return NextResponse.json({ record: notionPageToRecord(page) })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'update_failed', message: String(e) }, { status: 500 })
  }
}

// DELETE /api/diet/[id] — 刪除紀錄（移至 Notion 垃圾桶，非永久刪除）
// 補齊：IDOR防護、刪除後清除快取（原版本這兩項都缺）
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getUserAndDietDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const { id } = await params

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)

    // IDOR防護：確認這個pageId真的屬於該使用者記錄的飲食紀錄資料庫，不符合直接拒絕
    await verifyPageOwnership(accessToken, result.userId, id, 'diet')

    await trashPage(accessToken, id, result.userId)

    invalidateDatabaseCache(result.dietDbId)

    return NextResponse.json({ status: 'trashed' })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'delete_failed', message: String(e) }, { status: 500 })
  }
}
