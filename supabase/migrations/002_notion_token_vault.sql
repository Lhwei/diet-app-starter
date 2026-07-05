-- ============================================
-- Notion Token 加密存放：使用 Supabase Vault (Transparent Column Encryption)
-- 規格要求：access_token / refresh_token 不可明文存放，
-- 只能透過 service_role 權限限制的 Postgres function 存取，
-- 一般角色（authenticated/anon）完全不能直接查詢明文
-- ============================================

-- 1. 啟用 Vault extension（如果專案還沒啟用）
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- 2. notion_connections 表建議欄位設計：
--    access_token_key_id  uuid  -- 指向vault.secrets的key，不是明文本身
--    refresh_token_key_id uuid
--    (實際明文存在vault.secrets裡，這張表只存「指向哪個secret」的key id)

-- 若欄位尚未建立，先加上：
ALTER TABLE public.notion_connections
  ADD COLUMN IF NOT EXISTS access_token_key_id uuid,
  ADD COLUMN IF NOT EXISTS refresh_token_key_id uuid;

-- 3. 寫入token的function：只能被service_role呼叫，一般角色沒有EXECUTE權限
-- 這裡示範「新增或更新」token的邏輯：
--   若該使用者已有key_id，用vault.update_secret覆蓋舊值（整組覆蓋，符合規格要求）
--   若沒有，用vault.create_secret建立新的，並把回傳的key_id存回notion_connections

CREATE OR REPLACE FUNCTION public.set_notion_tokens(
  p_user_id uuid,
  p_access_token text,
  p_refresh_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_access_key_id uuid;
  v_refresh_key_id uuid;
BEGIN
  SELECT access_token_key_id, refresh_token_key_id
  INTO v_access_key_id, v_refresh_key_id
  FROM public.notion_connections
  WHERE user_id = p_user_id;

  IF v_access_key_id IS NULL THEN
    v_access_key_id := vault.create_secret(p_access_token, 'notion_access_token_' || p_user_id::text);
  ELSE
    PERFORM vault.update_secret(v_access_key_id, p_access_token);
  END IF;

  IF v_refresh_key_id IS NULL THEN
    v_refresh_key_id := vault.create_secret(p_refresh_token, 'notion_refresh_token_' || p_user_id::text);
  ELSE
    PERFORM vault.update_secret(v_refresh_key_id, p_refresh_token);
  END IF;

  UPDATE public.notion_connections
  SET access_token_key_id = v_access_key_id,
      refresh_token_key_id = v_refresh_key_id
  WHERE user_id = p_user_id;
END;
$$;

-- 只授權給service_role，authenticated/anon完全不能呼叫
REVOKE ALL ON FUNCTION public.set_notion_tokens FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_notion_tokens TO service_role;


-- 4. 讀取token的function：解密後回傳明文，但只能被service_role呼叫
-- 呼叫端（Node.js伺服器程式碼）拿到明文後只能存在記憶體臨時使用，用完即棄，不可再另外快取或log

CREATE OR REPLACE FUNCTION public.get_notion_tokens(p_user_id uuid)
RETURNS TABLE(access_token text, refresh_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = nc.access_token_key_id),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = nc.refresh_token_key_id)
  FROM public.notion_connections nc
  WHERE nc.user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_notion_tokens FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_notion_tokens TO service_role;

-- ============================================
-- 重要注意事項：
-- 1. Supabase預設會記錄SQL statement log，INSERT/UPDATE語句若直接包含明文token會出現在log裡
--    這裡用function包裝、參數化傳入，可大幅降低這個風險，但仍建議在Supabase Dashboard
--    確認Log等級設定，避免完整SQL被記錄
-- 2. 呼叫這兩個function必須用SUPABASE_SERVICE_ROLE_KEY建立的client，
--    絕對不能用anon key呼叫（會直接被REVOKE擋掉，但仍要在應用層再次確認呼叫方式正確）
-- 3. get_notion_tokens的回傳結果，Node.js端拿到後：
--    - 不可以console.log整個結果物件
--    - 不可以把access_token/refresh_token原樣回傳給前端
--    - 用完該次Notion API呼叫後，變數應盡快脫離scope，不要存在全域變數或長期物件裡
-- ============================================
