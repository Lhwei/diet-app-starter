// app/api/ai/diet-context/route.ts
// 唯讀端點：把使用者一段期間的飲食紀錄整理成適合餵給AI的文字內容
// 全程只呼叫 queryDatabase（對應 Notion databases.query API），
// 不呼叫任何 createDatabasePage / updatePageProperties，保證不會修改任何一筆飲食紀錄
//
// ⚠️ 分頁修正（本次新增）：原本只呼叫一次queryDatabase，Notion API單次查詢
// 上限是100筆（page_size最大100）。如果使用者選的時間區間內飲食紀錄超過100筆，
// 後面的紀錄會被Notion回應的has_more:true悄悄截斷，餵給AI的資料會不完整、
// 缺一段時間的紀錄，而且不會報任何錯誤，是功能性bug而非單純效能問題。
// 現在改成while迴圈，跟 physio/route.ts、weight-projection/route.ts 一樣的
// 分頁模式，持續抓取直到 has_more 為 false，確保整個時間區間的紀錄都完整拿到。
// pageCount上限10（最多1000筆）是防呆機制，避免帳號資料異常龐大時無限迴圈。

import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { queryDatabase, NotionApiError } from '@/lib/notion/client'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { dietFields, dietRecordDateProp, DietFieldType } from '@/lib/notion/dietFieldsConfig'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start') // YYYY-MM-DD
  const endDate = searchParams.get('end')     // YYYY-MM-DD

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('diet_db_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection?.diet_db_id) {
    return NextResponse.json({ error: 'notion_not_connected' }, { status: 400 })
  }

  const accessToken = await getValidNotionAccessToken(user.id)

  try {
    // 只呼叫 queryDatabase，不呼叫任何寫入方法，確保完全唯讀。
    // 傳入 user.id 讓底層 notionFetch 遇到401時能自動刷新token重試。
    // dietRecordDateProp('記錄日期') 是獨立於 dietFields 之外的真正Date類型欄位，
    // 專門用來做date filter/sort（title類型不支援date filter）。
    //
    // 用while迴圈持續抓取所有分頁，直到 has_more 為 false 或達到pageCount上限，
    // 確保時間區間內超過100筆的紀錄不會被悄悄截斷。
    let allPages: any[] = []
    let cursor: string | undefined = undefined
    let hasMore = true
    let pageCount = 0

    while (hasMore && pageCount < 10) {
      const queryBody: Record<string, any> = {
        filter: startDate && endDate ? {
          and: [
            { property: dietRecordDateProp, date: { on_or_after: startDate } },
            { property: dietRecordDateProp, date: { on_or_before: endDate } },
          ],
        } : undefined,
        sorts: [{ property: dietRecordDateProp, direction: 'ascending' }],
        page_size: 100,
      }
      if (cursor) queryBody.start_cursor = cursor

      const response = await queryDatabase(accessToken, connection.diet_db_id, queryBody, user.id)
      allPages = allPages.concat(response.results ?? [])
      hasMore = Boolean(response.has_more)
      cursor = response.next_cursor
      pageCount++
    }

    // 依 dietFieldsConfig.ts 的 type 動態讀取每個property的值，
    // 不寫死欄位清單，未來 dietFields 增減欄位時這裡會自動同步。
    const getFieldValue = (props: any, notionProp: string, type: DietFieldType) => {
      const p = props[notionProp]
      if (!p) return null
      switch (type) {
        case 'select': return p.select?.name ?? null
        case 'multi_select': return p.multi_select?.map((o: any) => o.name).join('、') ?? null
        case 'number': return p.number ?? null
        case 'rich_text': return p.rich_text?.map((t: any) => t.plain_text).join('') ?? null
        case 'title': return p.title?.map((t: any) => t.plain_text).join('') ?? null
        case 'date': return p.date?.start ?? null
        default: return null
      }
    }

    // 把Notion的property結構，轉換成給AI看的簡潔文字（而不是丟原始JSON給AI，
    // 這樣可以省token、也讓AI更容易理解每一餐的內容）
    const summaries = allPages.map((page: any) => {
      const props = page.properties
      const record: Record<string, any> = {
        日期: props[dietRecordDateProp]?.date?.start ?? null,
      }
      for (const field of dietFields) {
        record[field.label] = getFieldValue(props, field.notionProp, field.type)
      }
      return record
    })

    return NextResponse.json({ records: summaries })
  } catch (e) {
    console.error('[ai-diet-context] 查詢失敗:', e)
    if (e instanceof NotionApiError && e.status === 401) {
      return NextResponse.json({ error: 'notion_token_invalid' }, { status: 401 })
    }
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }
}