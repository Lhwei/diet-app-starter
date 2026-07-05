import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server Component / Route Handler / Server Action 用的 Supabase client
// Session 存放於 httpOnly cookie，不使用 localStorage
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component 呼叫 setAll 時可能會出錯，這是預期行為
          }
        }
      },
    }
  )
}

// 只在伺服器端 API Route 使用，權限最高，可繞過 RLS。絕不可在 Client Component 使用。
export function createServiceRoleClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
