import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getValidNotionAccessToken } from '@/lib/notion/tokenManager'
import { queryDatabase, NotionApiError } from '@/lib/notion/client'

// GET /api/dashboard/profile-target
// 讀取「個人資料」裡所有跟儀表板「目標 vs 現況」標示相關的欄位
// 個人資料資料庫設計為單筆記錄（每個使用者只有一列），取第一筆即可
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const defaultResponse = {
    calorieTarget: 1600,
    targetWeight: null,
    heightCm: null,
    gender: null,
    // 腰圍健康上限：衛福部標準，男性90cm / 女性80cm，無性別資料時給一個中性參考值
    waistHealthyMax: null,
    targetRatioText: null,
    source: 'default',
  }

  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('notion_connections')
    .select('personal_db_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection || connection.status !== 'connected' || !connection.personal_db_id) {
    return NextResponse.json(defaultResponse)
  }

  try {
    const accessToken = await getValidNotionAccessToken(user.id)
    const data = await queryDatabase(accessToken, connection.personal_db_id, { page_size: 1 })
    const page = data.results?.[0]

    if (!page) return NextResponse.json(defaultResponse)

    const props = page.properties
    const calorieTarget = props?.['每日熱量目標(kcal)']?.number ?? 1600
    const targetWeight = props?.['目標體重(kg)']?.number ?? null
    const heightCm = props?.['身高(cm)']?.number ?? null
    const gender = props?.['性別']?.select?.name ?? null
    const waistHealthyMax = gender === '男' ? 90 : gender === '女' ? 80 : null
    const targetRatioText = props?.['三大營養素目標比例']?.rich_text?.[0]?.plain_text ?? null

    return NextResponse.json({
      calorieTarget,
      targetWeight,
      heightCm,
      gender,
      waistHealthyMax,
      targetRatioText,
      source: 'profile',
    })
  } catch (e) {
    return NextResponse.json(defaultResponse)
  }
}
