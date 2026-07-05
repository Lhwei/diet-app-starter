-- ============================================
-- 一次性資料搬移：把 notion_connections 表裡舊的明文 access_token / refresh_token
-- 搬進 Supabase Vault（加密存放），並清除明文欄位
--
-- 執行前請先確認：
-- 1. 002_notion_token_vault.sql 已經成功執行過（set_notion_tokens / get_notion_tokens 已建立）
-- 2. notion_connections 表目前同時存在明文欄位(access_token, refresh_token)
--    與Vault欄位(access_token_key_id, refresh_token_key_id)
--
-- 這份migration做的事：
-- 1. 對每一列明文token存在、但Vault key_id還是NULL的資料，
--    呼叫 vault.create_secret() 加密後把回傳的key_id存回去
-- 2. 確認搬移成功後，才把舊的明文欄位清空（不是刪除欄位本身，只清內容，保留欄位方便回滾）
-- ============================================

DO $$
DECLARE
  r RECORD;
  v_access_key_id uuid;
  v_refresh_key_id uuid;
BEGIN
  FOR r IN
    SELECT user_id, access_token, refresh_token
    FROM public.notion_connections
    WHERE access_token IS NOT NULL
      AND refresh_token IS NOT NULL
      AND access_token_key_id IS NULL  -- 只處理還沒搬移過的
  LOOP
    v_access_key_id := vault.create_secret(r.access_token, 'notion_access_token_' || r.user_id::text);
    v_refresh_key_id := vault.create_secret(r.refresh_token, 'notion_refresh_token_' || r.user_id::text);

    UPDATE public.notion_connections
    SET access_token_key_id = v_access_key_id,
        refresh_token_key_id = v_refresh_key_id
    WHERE user_id = r.user_id;

    RAISE NOTICE 'Migrated tokens for user_id: %', r.user_id;
  END LOOP;
END $$;


-- ============================================
-- 驗證搬移是否成功：先執行這段確認每個使用者都拿到對應的key_id，
-- 且透過get_notion_tokens能正確解密回原本的token值再進行下一步
-- ============================================
-- SELECT nc.user_id, nc.access_token_key_id, nc.refresh_token_key_id,
--        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = nc.access_token_key_id) AS decrypted_access,
--        nc.access_token AS original_access
-- FROM public.notion_connections nc
-- WHERE nc.access_token_key_id IS NOT NULL;
--
-- 比對 decrypted_access 跟 original_access 的值是否完全一致，
-- 若一致才進行下一步清空明文欄位，避免資料還沒確認正確就先刪掉舊資料


-- ============================================
-- 確認上面驗證都正確無誤後，才執行這一段清空明文欄位
-- （先註解掉，隊長手動確認完再取消註解執行）
-- ============================================
-- UPDATE public.notion_connections
-- SET access_token = NULL,
--     refresh_token = NULL
-- WHERE access_token_key_id IS NOT NULL
--   AND refresh_token_key_id IS NOT NULL;


-- ============================================
-- 資料都搬移確認無誤、且應用程式已穩定運作一段時間後，
-- 可以考慮把明文欄位整個DROP掉（非必要，先保留也無妨）
-- ============================================
-- ALTER TABLE public.notion_connections DROP COLUMN access_token;
-- ALTER TABLE public.notion_connections DROP COLUMN refresh_token;
