-- ============================================
-- RLS Policies for Notion Webapp
-- 套用原則：
-- 1. 每張表都先ENABLE ROW LEVEL SECURITY
-- 2. 不用 FOR ALL，分成SELECT/INSERT/UPDATE/DELETE四條policy
-- 3. SELECT/DELETE只用USING，INSERT只用WITH CHECK，UPDATE兩者都要
-- 4. auth.uid()包一層(select ...)以提升效能（避免每一列都重新求值）
-- 5. TO authenticated，明確排除anon角色，不要只靠auth.uid()條件擋掉anon
-- ============================================

-- 1. notion_connections：使用者的Notion連線狀態、workspace資訊、頁面/資料庫ID對照
ALTER TABLE public.notion_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_connection"
ON public.notion_connections
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "users_insert_own_connection"
ON public.notion_connections
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users_update_own_connection"
ON public.notion_connections
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users_delete_own_connection"
ON public.notion_connections
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- 索引：RLS policy用到的欄位務必建索引，否則大量資料時效能會明顯下降
CREATE INDEX IF NOT EXISTS idx_notion_connections_user_id
ON public.notion_connections (user_id);


-- 2. oauth_states：OAuth state參數的短期儲存（含TTL），用於防CSRF
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- state表理論上只應該由伺服器端(service_role)存取，一般使用者不該能直接查詢自己的state
-- 所以這裡刻意不開放給authenticated角色任何操作，只有service_role（天生bypass RLS）能用
-- 這條policy的作用是：即使有人不小心用anon/authenticated的key連過來，也完全查不到、寫不進任何資料
CREATE POLICY "no_direct_client_access"
ON public.oauth_states
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at
ON public.oauth_states (expires_at);


-- 3. 假設有一張表用來記錄使用者刪除帳號/資料的請求或審計紀錄（若尚未建立可先略過）
-- ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "users_select_own_deletion_request"
-- ON public.account_deletion_requests
-- FOR SELECT TO authenticated
-- USING ((select auth.uid()) = user_id);


-- ============================================
-- 驗證方式（部署後務必手動測試，不要只憑肉眼檢查SQL）：
-- 1. Supabase Dashboard → SQL Editor → 右上角有「User Management」可以Impersonate某個使用者
-- 2. 切換成使用者A，執行 SELECT * FROM notion_connections; 應該只看到A自己的那一列
-- 3. 切換成使用者B，執行同樣查詢，應該完全看不到A的資料
-- 4. 嘗試用anon角色（未登入）查詢，應該完全查不到任何資料
-- ============================================
