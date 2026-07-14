import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { retrievePage, updatePageProperties, trashPage, verifyPageOwnership, NotionApiError } from '@/lib/notion/client'
import { formValuesToPhysioProperties, notionPageToPhysioRecord } from '@/lib/notion/physioMapper'
import { invalidateDatabaseCache } from '@/lib/notion/queryCache'
import { handleApiError } from '@/lib/api/errorResponse'
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getUserAndPhysioDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }
  const { id } = await params

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)
    // IDOR防護：確認這個pageId真的屬於該使用者記錄的生理紀錄資料庫，不符合直接拒絕
    await verifyPageOwnership(accessToken, result.userId, id, 'physio')

    const page = await retrievePage(accessToken, id, result.userId)
    return NextResponse.json({ record: notionPageToPhysioRecord(page) })
  } catch (e) {
    return handleApiError(e, 'query_failed')
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getUserAndPhysioDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }
  const { id } = await params
  const body = await request.json()
  const recordDate = body.recordDate

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)
    await verifyPageOwnership(accessToken, result.userId, id, 'physio')

    const properties = formValuesToPhysioProperties(body, recordDate)
    const page = await updatePageProperties(accessToken, id, properties, result.userId)

    invalidateDatabaseCache(result.physioDbId)

    return NextResponse.json({ record: notionPageToPhysioRecord(page) })
  } catch (e) {
    return handleApiError(e, 'query_failed')
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getUserAndPhysioDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }
  const { id } = await params

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)
    await verifyPageOwnership(accessToken, result.userId, id, 'physio')

    await trashPage(accessToken, id, result.userId)

    invalidateDatabaseCache(result.physioDbId)

    return NextResponse.json({ status: 'trashed' })
  } catch (e) {
    return handleApiError(e, 'query_failed')
  }
}