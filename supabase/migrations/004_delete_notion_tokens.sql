-- ============================================
-- 帳號刪除功能所需：清除Vault裡的加密token
-- 規格10要求：使用者可自行「刪除帳號／刪除我的資料」，
-- 需連動清除Supabase中的紀錄與加密token
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_notion_tokens(p_user_id uuid)
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

  IF v_access_key_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_access_key_id;
  END IF;

  IF v_refresh_key_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_refresh_key_id;
  END IF;

  DELETE FROM public.notion_connections WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_notion_tokens FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.delete_notion_tokens TO service_role;
