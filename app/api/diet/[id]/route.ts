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

// 「記錄時間」是Notion資料庫的title欄位。修正重點：
// 原本PATCH直接用 body.recordTitle，若前端沒有傳這個欄位（目前DietRecordForm.tsx確實沒有傳），
// title會被寫成空字串，等於整筆紀錄在Notion列表裡顯示成沒有標題。
// 現在改成：優先用 recordTitle；沒有的話，依 recordDateISO 對應的時間點組標題，
// 跟 app/api/diet/route.ts 的邏輯保持一致，確保title字串跟「記錄日期」欄位永遠是同一個時間點。
function buildRecordTitle(values: Record<string, any>, recordDateISO: string): string {
  if (values.recordTitle) return String(values.recordTitle)
  return new Date(recordDateISO).toLocaleString('zh-TW', { hour12: false })
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
    return handleApiError(e, 'query_failed')
  }
}

// PATCH /api/diet/[id] — 修改紀錄
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

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)

    // IDOR防護：確認這個pageId真的屬於該使用者記錄的飲食紀錄資料庫，不符合直接拒絕
    await verifyPageOwnership(accessToken, result.userId, id, 'diet')

    const recordDateISO = buildRecordDateISO(body)
    const recordTitle = buildRecordTitle(body, recordDateISO)
    const properties = formValuesToNotionProperties(body, recordTitle, recordDateISO)
    const page = await updatePageProperties(accessToken, id, properties, result.userId)

    invalidateDatabaseCache(result.dietDbId)

    return NextResponse.json({ record: notionPageToRecord(page) })
  } catch (e) {
    return handleApiError(e, 'query_failed')
  }
}

// DELETE /api/diet/[id] — 刪除紀錄（移至 Notion 垃圾桶，非永久刪除）
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
    return handleApiError(e, 'query_failed')
  }
}
