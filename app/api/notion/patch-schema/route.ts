import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { retrieveDatabase, updateDatabaseProperties, NotionApiError } from '@/lib/notion/client'
import { physioRecordSchema, dietRecordSchema } from '@/lib/notion/schemas'

// 修補既有使用者的Notion資料庫 property
//
// 背景：糖/酒精/咖啡因(飲食)、如廁類型(生理) 這幾個欄位是在使用者已經
// 初次建立過Notion資料庫「之後」才補進schemas.ts的。凡是在這次修正之前
// 就完成過 /api/notion/init 流程的既有使用者，他們實際的Notion資料庫
// 仍然缺這幾個property（schemas.ts只有在「建立新資料庫」時會被用到，
// 不會回頭修補已存在的資料庫）。
//
// 這個route讓既有使用者可以呼叫一次，把目前schema定義裡「資料庫還沒有的
// property」用 retrieveDatabase + updateDatabaseProperties(client.ts) 補上去。
// 全程走notionFetch封裝（401自動刷新token重試、429指數退避），
// 不是額外開一條裸fetch去繞過既有錯誤處理機制。
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('physio_db_id, diet_db_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection || connection.status !== 'connected') {
    return NextResponse.json({ error: 'notion_not_ready' }, { status: 400 })
  }

  try {
    const accessToken = await getValidNotionAccessToken(user.id)
    const patched: Record<string, string[]> = { physio: [], diet: [] }

    if (connection.physio_db_id) {
      patched.physio = await patchMissingProperties(accessToken, user.id, connection.physio_db_id, physioRecordSchema)
    }
    if (connection.diet_db_id) {
      patched.diet = await patchMissingProperties(accessToken, user.id, connection.diet_db_id, dietRecordSchema)
    }

    return NextResponse.json({ success: true, patched })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'patch_failed', message: String(e) }, { status: 500 })
  }
}

async function patchMissingProperties(
  accessToken: string,
  userId: string,
  databaseId: string,
  fullSchema: Record<string, any>
): Promise<string[]> {
  const database = await retrieveDatabase(accessToken, databaseId, userId)
  const existing = database?.properties ?? {}

  const missing: Record<string, any> = {}
  for (const [propName, propSchema] of Object.entries(fullSchema)) {
    if (!(propName in existing)) {
      missing[propName] = propSchema
    }
  }

  if (Object.keys(missing).length === 0) return []

  await updateDatabaseProperties(accessToken, databaseId, missing, userId)
  return Object.keys(missing)
}
