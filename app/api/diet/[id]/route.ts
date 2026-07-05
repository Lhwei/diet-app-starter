import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { retrievePage, updatePageProperties, trashPage, NotionApiError } from '@/lib/notion/client'
import { formValuesToNotionProperties, notionPageToRecord } from '@/lib/notion/dietMapper'

async function getUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// GET /api/diet/[id] — 查詢單筆紀錄詳情
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const accessToken = await getValidNotionAccessToken(userId)
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
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const recordTitle = body.recordTitle

  try {
    const accessToken = await getValidNotionAccessToken(userId)
    const properties = formValuesToNotionProperties(body, recordTitle)
    const page = await updatePageProperties(accessToken, id, properties)
    return NextResponse.json({ record: notionPageToRecord(page) })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'update_failed', message: String(e) }, { status: 500 })
  }
}

// DELETE /api/diet/[id] — 刪除紀錄（移至 Notion 垃圾桶，非永久刪除）
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const accessToken = await getValidNotionAccessToken(userId)
    await trashPage(accessToken, id)
    return NextResponse.json({ status: 'trashed' })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'delete_failed', message: String(e) }, { status: 500 })
  }
}
