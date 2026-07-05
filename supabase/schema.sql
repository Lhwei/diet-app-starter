-- =========================================================
-- 飲食管理 Webapp — Supabase 初始 Schema
-- 所有表皆啟用 RLS，policy 一律以 auth.uid() 限定
-- =========================================================

-- 1. Notion 連線資訊（access_token / refresh_token 存放處）
create table if not exists public.notion_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  bot_id text,
  workspace_id text,
  workspace_name text,
  duplicated_template_id text,
  status text not null default 'connected', -- connected / revoked / error
  init_step text not null default 'pending', -- pending / page_created / databases_created / completed
  parent_page_id text, -- 使用者授權時選取的父層頁面
  personal_db_id text, -- 個人資料改為 Database（原規格是 Page，因欄位含 Select/Number 改用 Database）
  ai_prompt_page_id text,
  physio_db_id text,
  diet_db_id text,
  refreshing_since timestamptz, -- token 刷新鎖，防止併發刷新造成 refresh_token 輪替衝突
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.notion_connections enable row level security;

create policy "Users can view own notion connection"
  on public.notion_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own notion connection"
  on public.notion_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notion connection"
  on public.notion_connections for update
  using (auth.uid() = user_id);

-- 2. OAuth state 暫存表（防 CSRF，含 TTL）
create table if not exists public.oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.oauth_states enable row level security;

create policy "Users can view own oauth state"
  on public.oauth_states for select
  using (auth.uid() = user_id);

-- 建議另建 cron / edge function 定期清除已過期的 oauth_states

-- 3. 使用者個人設定（對應 Notion「個人資料」頁面的鏡像/快取，可選）
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text default 'Asia/Taipei',
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can manage own profile"
  on public.user_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
