import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createPage, createDatabase, searchAccessiblePages, appendBlockChildren, NotionApiError } from '@/lib/notion/client'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { personalProfileSchema, physioRecordSchema, dietRecordSchema } from '@/lib/notion/schemas'
import { buildAiPromptContent } from '@/lib/notion/buildAiPromptContent'
import { markdownToNotionBlocks } from '@/lib/notion/markdownToNotionBlocks'

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

  const accessToken = await getValidNotionAccessToken(user.id)

  try {
    let parentPageId = connection.parent_page_id
    if (!parentPageId) {
      const searchResult = await searchAccessiblePages(accessToken, user.id)
      const pages = searchResult.results ?? []
      if (pages.length === 0) {
        return NextResponse.redirect(`${origin}/settings?notion_error=no_parent_page`, 303)
      }
      parentPageId = pages[0].id
      await admin.from('notion_connections').update({ parent_page_id: parentPageId }).eq('user_id', user.id)
    }

    let personalDbId = connection.personal_db_id
    if (!personalDbId) {
      const personalDb = await createDatabase(accessToken, parentPageId, '個人資料', personalProfileSchema, user.id)
      personalDbId = personalDb.id
      await admin
        .from('notion_connections')
        .update({ personal_db_id: personalDbId, init_step: 'page_created' })
        .eq('user_id', user.id)
    }

    let aiPromptPageId = connection.ai_prompt_page_id
    if (!aiPromptPageId) {
      const aiPromptPage = await createPage(accessToken, parentPageId, 'AI用PROMPT', user.id)
      aiPromptPageId = aiPromptPage.id
      await admin
        .from('notion_connections')
        .update({ ai_prompt_page_id: aiPromptPageId })
        .eq('user_id', user.id)
    }

    let physioDbId = connection.physio_db_id
    if (!physioDbId) {
      const physioDb = await createDatabase(accessToken, parentPageId, '生理紀錄', physioRecordSchema, user.id)
      physioDbId = physioDb.id
      await admin
        .from('notion_connections')
        .update({ physio_db_id: physioDbId, init_step: 'databases_created' })
        .eq('user_id', user.id)
    }

    let dietDbId = connection.diet_db_id
    if (!dietDbId) {
      const dietDb = await createDatabase(accessToken, parentPageId, '飲食紀錄', dietRecordSchema, user.id)
      dietDbId = dietDb.id
      await admin.from('notion_connections').update({ diet_db_id: dietDbId }).eq('user_id', user.id)
    }

    // 把三個資料庫ID與分析用Prompt範本寫入「AI用PROMPT」頁面內容。
    // 用 markdownToNotionBlocks 把markdown文字正確轉成heading/code/paragraph等
    // block結構，而不是直接把整串文字塞進去（那樣Notion API會回400）。
    // 這一步失敗不應該讓整個init流程失敗（前面四個物件都已經建立成功），
    // 只記錄錯誤即可，不影響 init_step 狀態機。
    try {
      const aiPromptContent = buildAiPromptContent({ personalDbId, physioDbId, dietDbId })
      const blocks = markdownToNotionBlocks(aiPromptContent)
      // Notion API單次append最多100個block，這裡分批送出避免超過限制
      const BATCH_SIZE = 90
      for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
        await appendBlockChildren(accessToken, aiPromptPageId, blocks.slice(i, i + BATCH_SIZE), user.id)
      }
    } catch (e) {
      console.error('[notion-init] 寫入AI用PROMPT頁面內容失敗:', e)
    }

    await admin.from('notion_connections').update({ init_step: 'completed' }).eq('user_id', user.id)

    return NextResponse.redirect(`${origin}/settings?notion_init=completed`, 303)
  } catch (e) {
    console.error('[notion-init] 失敗:', e)
    if (e instanceof NotionApiError && e.status === 401) {
      await admin.from('notion_connections').update({ status: 'revoked' }).eq('user_id', user.id)
      return NextResponse.redirect(`${origin}/settings?notion_error=token_invalid`, 303)
    }
    return NextResponse.redirect(`${origin}/settings?notion_error=init_failed`, 303)
  }
}
