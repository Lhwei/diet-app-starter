import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Next.js 16 把 middleware.ts 改名為 proxy.ts，export 的函式也從 middleware 改名為 proxy
// 概念不變：在請求進入 Server Component 前刷新 Supabase session cookie、攔截未登入路由
//
// ⚠️ 官方安全建議（Next.js 16 起）：
// Proxy／Middleware 不應是唯一的身分驗證防線，只適合做「路由層級」的重新導向。
// 真正的授權判斷（例如這筆資料是不是這個 user 的）一定要在 Server Component / Route Handler /
// Server Action 裡再次呼叫 supabase.auth.getUser() 驗證，並搭配 Supabase RLS policy 做資料層防護。
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
