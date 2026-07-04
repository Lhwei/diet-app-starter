import { createBrowserClient } from '@supabase/ssr'

// Client Component 用的 Supabase client（只帶 anon key，搭配 RLS 使用是安全的）
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
