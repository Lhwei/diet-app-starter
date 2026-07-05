import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// DELETE /api/account
// 規格10：使用者可自行「刪除帳號／刪除我的資料」
// 需連動清除：Supabase中的紀錄（notion_connections等）、加密token（Vault）、Supabase Auth帳號本身
// 文案需說明：Notion中的實際內容仍存在使用者自己的workspace，不受本App控制
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const userId = user.id

  try {
    const admin = createServiceRoleClient()

    // 1. 清除Vault裡的加密token + notion_connections紀錄
    // （delete_notion_tokens這個function內部會一併刪除notion_connections那一列）
    const { error: tokenDeleteError } = await admin.rpc('delete_notion_tokens', {
      p_user_id: userId,
    })
    if (tokenDeleteError) {
      throw new Error('token_cleanup_failed')
    }

    // 2. 如果有其他跟這個使用者相關的表（例如帳號刪除審計紀錄等），也一併清除
    // 若隊長之後有新增其他資料表，記得在這裡補上對應的刪除語句

    // 3. 刪除Supabase Auth帳號本身（需要service_role權限）
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      throw new Error('auth_deletion_failed')
    }

    return NextResponse.json({
      success: true,
      message: '帳號與App內資料已刪除。請注意：您Notion workspace中原有的內容不受本App控制，仍會保留在您的Notion帳戶中。',
    })
  } catch (e) {
    // 不透露內部細節，只回通用錯誤訊息
    return NextResponse.json(
      { error: 'account_deletion_failed', message: '刪除帳號時發生錯誤，請稍後再試或聯繫客服。' },
      { status: 500 }
    )
  }
}
