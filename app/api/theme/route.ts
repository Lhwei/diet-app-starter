import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isThemeId, DEFAULT_THEME } from '@/lib/theme/themes'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('theme_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ themeId: data?.theme_id ?? DEFAULT_THEME })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const themeId = body?.themeId

  if (typeof themeId !== 'string' || !isThemeId(themeId)) {
    return NextResponse.json({ error: '無效的主題 id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      { user_id: user.id, theme_id: themeId },
      { onConflict: 'user_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ themeId })
}