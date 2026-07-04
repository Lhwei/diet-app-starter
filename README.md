# 飲食管理 Webapp — Starter

## 這一版包含什麼
- ✅ Next.js App Router 專案骨架
- ✅ Supabase Auth（Google OAuth）登入流程，session 存 httpOnly cookie（@supabase/ssr）
- ✅ Notion Public Integration OAuth 2.0 授權流程（state 防 CSRF + TTL 驗證）
- ✅ Supabase schema（notion_connections / oauth_states / user_profiles，全表 RLS）
- ✅ 三大頁面基本 UI：/diet、/dashboard、/settings（RWD，Tailwind）
- ✅ Middleware 自動保護未登入路由，導向 /login

## 尚未包含（下一步）
- ❌ Notion 自動建立「個人資料」「AI用PROMPT」頁面 + 「生理紀錄」「飲食紀錄」資料庫（冪等狀態機）
- ❌ Notion token 刷新邏輯（refresh_token 輪替 + 併發鎖）
- ❌ 飲食紀錄 CRUD API（含 database_id 歸屬驗證，防 IDOR）
- ❌ 儀表板圖表資料彙整 API + 前端圖表元件
- ❌ Electron 桌面版包裝

## 開始使用

1. 複製 `.env.example` 為 `.env.local`，填入：
   - Supabase 專案的 URL / anon key / service role key（Settings → API）
   - Notion Integration 的 client_id / client_secret（https://www.notion.so/my-integrations 建立 Public Integration）
   - Notion redirect_uri 需與 Integration 設定的 Redirect URI 完全一致

2. 在 Supabase SQL Editor 執行 `supabase/schema.sql` 建立資料表與 RLS policy

3. 安裝套件並啟動開發伺服器：
   ```bash
   npm install
   npm run dev
   ```
   開啟 http://localhost:3000

4. Google OAuth 設定：
   - 到 Supabase Dashboard → Authentication → Providers → 啟用 Google，填入 Google Cloud Console 的 Client ID/Secret
   - Google Cloud Console 的 Authorized redirect URI 填：`https://<your-project>.supabase.co/auth/v1/callback`

5. Notion Integration 設定（developers.notion.com/my-integrations）：
   - 建立 Public Integration
   - Redirect URI 填：`http://localhost:3000/api/notion/oauth/callback`（本機）與正式網域各一組
   - 填妥隱私權政策、服務條款、support email（Public Integration 必填）

## 部署到 Vercel
- 在 Vercel Dashboard 分別設定 Production / Preview / Development 的環境變數
- `SUPABASE_SERVICE_ROLE_KEY` 只設在 Server-side，絕不要加 `NEXT_PUBLIC_` 前綴
- Notion redirect_uri 正式站需改為 `https://<你的網域>/api/notion/oauth/callback`，並同步在 Notion Integration 設定中新增
