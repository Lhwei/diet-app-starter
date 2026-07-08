import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createPage, createDatabase, searchAccessiblePages, NotionApiError } from '@/lib/notion/client'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { personalProfileSchema, physioRecordSchema, dietRecordSchema } from '@/lib/notion/schemas'

// 冪等狀態機：pending → page_created → databases_created → completed
// 每成功建立一個物件立即寫回 Supabase，中斷重試時會先檢查已有的物件，不重複建立
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const origin = new URL(request.url).origin

  if (!user) {
    return NextResponse.redirect(`${origin}/login`, 303)
  }

  const admin = createServiceRoleClient()

  const { data: connection, error: fetchError } = await admin
    .from('notion_connections')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError || !connection) {
    return NextResponse.redirect(`${origin}/settings?notion_error=not_connected`, 303)
  }

  if (connection.status !== 'connected') {
    return NextResponse.redirect(`${origin}/settings?notion_error=not_connected`, 303)
  }

  if (connection.init_step === 'completed') {
    return NextResponse.redirect(`${origin}/settings?notion_init=already_completed`, 303)
  }

  // 先確保拿到的是有效的 access_token（若已過期會自動用 refresh_token 換新，並處理併發刷新）
  const accessToken = await getValidNotionAccessToken(user.id)

  try {
    // 1. 找到使用者授權時選取的父層頁面（取第一個授權範圍內可寫入的頁面）
    let parentPageId = connection.parent_page_id
    if (!parentPageId) {
      const searchResult = await searchAccessiblePages(accessToken)
      const pages = searchResult.results ?? []
      if (pages.length === 0) {
        return NextResponse.redirect(`${origin}/settings?notion_error=no_parent_page`, 303)
      }
      parentPageId = pages[0].id
      await admin.from('notion_connections').update({ parent_page_id: parentPageId }).eq('user_id', user.id)
    }

    // 2. 建立「個人資料」資料庫（冪等：已存在則跳過）
    let personalDbId = connection.personal_db_id
    if (!personalDbId) {
      const personalDb = await createDatabase(accessToken, parentPageId, '個人資料', personalProfileSchema)
      personalDbId = personalDb.id
      await admin
        .from('notion_connections')
        .update({ personal_db_id: personalDbId, init_step: 'page_created' })
        .eq('user_id', user.id)
    }

    // 3. 建立「AI用PROMPT」頁面（冪等：已存在則跳過）
    let aiPromptPageId = connection.ai_prompt_page_id
    if (!aiPromptPageId) {
      const aiPromptPage = await createPage(accessToken, parentPageId, 'AI用PROMPT')
      aiPromptPageId = aiPromptPage.id
      await admin
        .from('notion_connections')
        .update({ ai_prompt_page_id: aiPromptPageId })
        .eq('user_id', user.id)
    }

    // 4. 建立「生理紀錄」資料庫（冪等：已存在則跳過）
    let physioDbId = connection.physio_db_id
    if (!physioDbId) {
      const physioDb = await createDatabase(accessToken, parentPageId, '生理紀錄', physioRecordSchema)
      physioDbId = physioDb.id
      await admin
        .from('notion_connections')
        .update({ physio_db_id: physioDbId, init_step: 'databases_created' })
        .eq('user_id', user.id)
    }

    // 5. 建立「飲食紀錄」資料庫（冪等：已存在則跳過）
    let dietDbId = connection.diet_db_id
    if (!dietDbId) {
      const dietDb = await createDatabase(accessToken, parentPageId, '飲食紀錄', dietRecordSchema)
      dietDbId = dietDb.id
      await admin.from('notion_connections').update({ diet_db_id: dietDbId }).eq('user_id', user.id)
    }

    // 6. 全部建立完成，標記 completed
    await admin.from('notion_connections').update({ init_step: 'completed' }).eq('user_id', user.id)

    return NextResponse.redirect(`${origin}/settings?notion_init=completed`, 303)
  } catch (e) {
    console.error('[notion-init] 失敗:', e)   // ← 加這行
    if (e instanceof NotionApiError && e.status === 401) {
      await admin.from('notion_connections').update({ status: 'revoked' }).eq('user_id', user.id)
      return NextResponse.redirect(`${origin}/settings?notion_error=token_invalid`, 303)
    }
    return NextResponse.redirect(`${origin}/settings?notion_error=init_failed`, 303)
  }
}
