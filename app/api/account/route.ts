import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// DELETE /api/account
// 規格10：使用者可自行「刪除帳號／刪除我的資料」
//
// 修正重點（原本500錯誤看不出真正原因，因為catch把所有錯誤都吞掉只回通用訊息）：
// 1. 每一步都分開try/catch並用console.error印出真實錯誤到伺服器端log（不會回傳給前端，
//    符合規格9「log不可洩漏系統內部細節」，但開發時終端機這裡才是真正除錯的地方）
// 2. 最可能的根源：刪除Auth使用者前，還有別的表格有外鍵(FK)指向這個user_id尚未清除，
//    Postgres會拒絕刪除並丟出FK constraint violation錯誤。這裡把所有「已知會關聯user_id」
//    的表格都在刪除Auth帳號前先清乾淨，並且用ignore-if-not-exists的方式處理，
//    避免某張表不存在或欄位命名不同時整個流程中斷
// 3. 刪除順序改成：先刪子表（oauth_states等短期表 -> notion_connections/token -> 其他業務表）
//    最後才刪Auth使用者本身，這是處理FK約束時的標準順序（先刪子，再刪父）

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const userId = user.id
  const admin = createServiceRoleClient()

  // 小工具：刪除失敗時印出真實錯誤到伺服器端console，但不中斷流程繼續往下清（部分表可能本來就沒資料）
  async function safeDelete(label: string, fn: () => Promise<{ error: any }>) {
    try {
      const { error } = await fn()
      if (error) {
        console.error(`[account-delete] ${label} 失敗:`, error)
        return { ok: false, label, error }
      }
      return { ok: true, label }
    } catch (e) {
      console.error(`[account-delete] ${label} 發生例外:`, e)
      return { ok: false, label, error: e }
    }
  }

  const results: any[] = []

  // 1. 如果有OAuth state暫存表（規格3要求的TTL短期儲存），先清掉這個user相關的紀錄
  results.push(
    await safeDelete('清除oauth_states', () =>
      admin.from('oauth_states').delete().eq('user_id', userId)
    )
  )

  // 2. 清除Vault裡的加密token + notion_connections紀錄
  results.push(
    await safeDelete('清除notion token與連線紀錄', async () => {
      const { error } = await admin.rpc('delete_notion_tokens', { p_user_id: userId })
      return { error }
    })
  )

  // 3. 保險起見，直接再嘗試刪一次notion_connections（避免RPC內部沒有真的刪到這張表）
  results.push(
    await safeDelete('清除notion_connections（保險）', () =>
      admin.from('notion_connections').delete().eq('user_id', userId)
    )
  )

  // 4. 若隊長之後新增了其他跟user_id關聯的表（例如帳號刪除審計紀錄），在這裡補上對應刪除語句：
  // results.push(await safeDelete('清除xxx表', () => admin.from('xxx').delete().eq('user_id', userId)))

  // 5. 最後才刪除Supabase Auth帳號本身（前面所有子表都清完，FK才不會擋住這一步）
  const authDeleteResult = await safeDelete('刪除Auth帳號', () =>
    admin.auth.admin.deleteUser(userId)
  )
  results.push(authDeleteResult)

  // 只要「刪除Auth帳號」這一步失敗，就視為整體刪除失敗（這才是真正必須成功的關鍵步驟）
  if (!authDeleteResult.ok) {
    console.error('[account-delete] 完整流程結果:', results)
    return NextResponse.json(
      {
        error: 'account_deletion_failed',
        message: '刪除帳號時發生錯誤，請稍後再試或聯繫客服。',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: '帳號與App內資料已刪除。請注意：您Notion workspace中原有的內容不受本App控制，仍會保留在您的notion帳號中。',
  })
}
