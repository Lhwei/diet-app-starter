import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { queryDatabase, createDatabasePage, updatePageProperties, NotionApiError } from '@/lib/notion/client'
import { formValuesToProfileProperties, notionPageToProfileRecord } from '@/lib/notion/profileMapper'
import { calculateBmr, calculateTdee, calculateBmi, suggestCalorieTarget, calculateWaterTargetRange } from '@/lib/nutrition/metabolicCalc'
import { cachedQueryDatabase, invalidateDatabaseCache, buildCacheKey } from '@/lib/notion/queryCache'

async function getUserAndProfileDbId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' as const }

  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('personal_db_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection || connection.status !== 'connected' || !connection.personal_db_id) {
    return { error: 'notion_not_ready' as const }
  }

  return { userId: user.id, personalDbId: connection.personal_db_id as string }
}

// 找出「屬於這個使用者」的個人資料頁面（走快取層，60秒內重複呼叫不會重打Notion API）
async function findExistingProfilePage(accessToken: string, personalDbId: string, userId: string) {
  const cacheKey = buildCacheKey(['db', personalDbId, 'profile', userId])

  return cachedQueryDatabase(['db', personalDbId, 'profile', userId], async () => {
    const filtered = await queryDatabase(accessToken, personalDbId, {
      filter: { property: 'user_id', rich_text: { equals: userId } },
      page_size: 1,
    })
    if (filtered.results?.[0]) return filtered.results[0]

    const fallback = await queryDatabase(accessToken, personalDbId, {
      sorts: [{ property: '最後更新日期', direction: 'descending' }],
      page_size: 1,
    })
    return fallback.results?.[0] ?? null
  })
}

// 個人資料資料庫設計為單筆記錄（每個使用者只有一列）
// GET走快取：60秒內重複讀取直接回傳快取結果，不重打Notion API
export async function GET() {
  const result = await getUserAndProfileDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)
    const page = await findExistingProfilePage(accessToken, result.personalDbId, result.userId)

    if (!page) {
      return NextResponse.json({ record: null })
    }

    return NextResponse.json({ record: notionPageToProfileRecord(page) })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'query_failed', message: String(e) }, { status: 500 })
  }
}

// PUT：新增或更新個人資料。
// 寫入成功後立刻 invalidateDatabaseCache，讓「這個資料庫」的所有快取失效，
// 這樣使用者存檔後馬上回到頁面重新讀取，保證拿到剛寫入的最新資料，不會看到過期的快取內容。
export async function PUT(request: Request) {
  const result = await getUserAndProfileDbId()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'unauthorized' ? 401 : 400 })
  }

  const body = await request.json()

  const bmr = calculateBmr({
    gender: body.gender,
    weightKg: Number(body.startWeight),
    heightCm: Number(body.heightCm),
    birthDate: body.birthDate,
  })
  const tdee = calculateTdee(bmr, body.activityFactor)
  const bmi = calculateBmi(Number(body.startWeight), Number(body.heightCm))
  const waterRange = calculateWaterTargetRange(Number(body.startWeight))

  const hasManualCalorieTarget = body.calorieTarget !== undefined && body.calorieTarget !== null && body.calorieTarget !== ''

  const enrichedBody = {
    ...body,
    bmr: bmr ?? undefined,
    tdee: tdee ?? undefined,
    bmi: bmi ?? undefined,
    waterTarget: waterRange?.suggested ?? undefined,
    calorieTarget: hasManualCalorieTarget ? body.calorieTarget : suggestCalorieTarget(tdee, body.targetMode) ?? undefined,
  }

  try {
    const accessToken = await getValidNotionAccessToken(result.userId)
    const properties = formValuesToProfileProperties(enrichedBody, result.userId)

    const existingPage = await findExistingProfilePage(accessToken, result.personalDbId, result.userId)

    const page = existingPage
      ? await updatePageProperties(accessToken, existingPage.id, properties)
      : await createDatabasePage(accessToken, result.personalDbId, properties)

    invalidateDatabaseCache(result.personalDbId)

    return NextResponse.json({ record: notionPageToProfileRecord(page) })
  } catch (e) {
    if (e instanceof NotionApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'save_failed', message: String(e) }, { status: 500 })
  }
}
