// app/api/ai/diet-context/route.ts
// 唯讀端點：把使用者一段期間的飲食紀錄整理成適合餵給AI的文字內容
// 全程只呼叫 notion.databases.query，不呼叫任何 create/update/delete，
// 保證不會修改到任何一筆飲食紀錄

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Client } from '@notionhq/client'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { dietFields, dietRecordDateProp } from '@/lib/dietFieldsConfig'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start') // YYYY-MM-DD
  const endDate = searchParams.get('end')     // YYYY-MM-DD

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const accessToken = await getValidNotionAccessToken(user.id)
  const notion = new Client({ auth: accessToken })

  const admin = await createClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('diet_db_id')
    .eq('user_id', user.id)
    .single()

  if (!connection?.diet_db_id) {
    return NextResponse.json({ error: 'notion_not_connected' }, { status: 400 })
  }

  // 只用 query，不用 pages.create / pages.update，確保完全唯讀
  const response = await notion.databases.query({
    database_id: connection.diet_db_id,
    filter: startDate && endDate ? {
      and: [
        { property: dietRecordDateProp, date: { on_or_after: startDate } },
        { property: dietRecordDateProp, date: { on_or_before: endDate } },
      ],
    } : undefined,
    sorts: [{ property: dietRecordDateProp, direction: 'ascending' }],
  })

  // 把Notion的property結構，轉換成給AI看的簡潔文字（而不是丟原始JSON給AI，
  // 這樣可以省token、也讓AI更容易理解每一餐的內容）
  const summaries = response.results.map((page: any) => {
    const props = page.properties
    const get = (notionProp: string) => {
      const field = dietFields.find(f => f.notionProp === notionProp)
      if (!field) return null
      const p = props[notionProp]
      if (!p) return null
      switch (field.type) {
        case 'select': return p.select?.name ?? null
        case 'multi_select': return p.multi_select?.map((o: any) => o.name).join('、') ?? null
        case 'number': return p.number ?? null
        case 'rich_text': return p.rich_text?.map((t: any) => t.plain_text).join('') ?? null
        case 'title': return p.title?.map((t: any) => t.plain_text).join('') ?? null
        default: return null
      }
    }

    return {
      日期: props[dietRecordDateProp]?.date?.start ?? null,
      餐別: get('餐別'),
      食物內容: get('食物內容'),

      // 六大類食物份量（對應dietFieldsConfig.ts裡的六個 (份) 欄位）
      全穀雜糧類份數: get('全穀雜糧類(份)'),
      豆魚蛋肉類份數: get('豆魚蛋肉類(份)'),
      蔬菜類份數: get('蔬菜類(份)'),
      水果類份數: get('水果類(份)'),
      乳品類份數: get('乳品類(份)'),
      油脂與堅果種子類份數: get('油脂與堅果種子類(份)'),

      // 換算後的三大營養素與熱量（readOnly欄位，由前端自動算好寫入Notion）
      總熱量: get('總熱量(kcal)'),
      蛋白質: get('蛋白質(g)'),
      脂質: get('脂質(g)'),
      碳水化合物: get('碳水化合物(g)'),
      三大營養素比例: get('三大營養素比例(%)'),

      膳食纖維: get('膳食纖維(g)'),
      鈉: get('鈉(mg)'),
      飽足感: get('飽足感'),
      油脂感知: get('油脂感知'),
      精神狀態: get('精神/睏意'),
      身體不適標記: get('身體不適標記'),
      場景來源: get('場景/來源'),
      備註: get('備註'),
    }
  })

  return NextResponse.json({ records: summaries })
}
