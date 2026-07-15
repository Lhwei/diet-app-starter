# 🥗 飲食管理小幫手（diet-tracker-webapp）

一個結合 Supabase 帳號系統與 Notion 資料儲存的個人飲食紀錄網頁應用。
使用者登入後，所有的個人資料、生理紀錄、飲食紀錄都會自動同步寫進
使用者自己的 Notion 工作區，方便長期追蹤健康數據，也不需要額外的資料庫費用。

## 這個專案在做什麼

- 記錄每日三餐、點心的飲食內容，並依「全穀雜糧類」「豆魚蛋肉類」「蔬菜類」
  「水果類」「乳品類」「油脂與堅果種子類」六大類食物換算份量
- 自動計算三大營養素（蛋白質／脂質／碳水化合物）與總熱量、營養素比例
- 記錄飽足感、油脂感知、精神狀態、身體不適標記等主觀感受，方便對照飲食內容
- 記錄生理數據（例如血糖、體重等），搭配儀表板呈現趨勢
- 使用者透過 Google 帳號登入（Supabase Auth），並將 Notion 帳號連結到自己的
  App，資料實際存放在使用者自己的 Notion 工作區裡，App 本身不留存一般使用者
  資料表，只留 Notion 連線的必要 metadata

## 技術架構

| 項目 | 使用技術 |
|---|---|
| 前端框架 | Next.js 16（App Router）+ React 19 |
| UI 樣式 | Tailwind CSS |
| 帳號系統 | Supabase Auth（Google OAuth 登入） |
| 敏感資料加密 | Supabase Vault（加密存放 Notion access_token / refresh_token） |
| 資料實際儲存 | Notion API（使用者自己的工作區，透過 OAuth 連接） |
| 圖表呈現 | Recharts |
| 資料抓取 | SWR |
| 部署平台 | Vercel |

## 專案結構

```
app/
  layout.tsx                        全站共用版型（Navbar、BottomNav）
  login/
    actions.ts                      Server Action：發起 Google OAuth 登入
  settings/                         Notion 連接設定頁面
  api/
    notion/
      oauth/
        start/route.ts              發起 Notion OAuth 授權
        callback/route.ts           Notion OAuth 回呼，寫入 metadata 與 Vault token
      init/route.ts                 建立 Notion 4 個物件（個人資料/AI用PROMPT/生理紀錄/飲食紀錄）
    profile/route.ts                讀寫使用者個人資料（透過 Notion API）
    physio/route.ts                 讀寫生理紀錄（透過 Notion API）
    diet/route.ts                   讀寫飲食紀錄（透過 Notion API，支援 ?date= 篩選）

components/
  NavBar.tsx                        上方導覽列
  ConditionalNavbar.tsx              依頁面路徑決定是否顯示導覽列
  ConditionalBottomNav.tsx          手機版下方導覽列
  LogoutButton.tsx                  登出按鈕
  PortionGuideHint.tsx              飲食紀錄表單上的「份量參考」外部連結提示

lib/
  supabase/
    client.ts                       瀏覽器端 Supabase client
    server.ts                       伺服器端 Supabase client（含 service role）
  notion/
    oauth.ts                        Notion OAuth code 換 token
    tokenManager.ts                 Notion token 讀寫（透過 Vault RPC 加密存取）
    schemas.ts                      Notion 資料庫欄位 schema 定義（建立資料庫時使用）
    dietMapper.ts                   飲食紀錄表單資料 <-> Notion property 轉換
  dietFieldsConfig.ts               飲食紀錄表單欄位設定（單一設定來源）

diagnose_notion_rpc.sql             診斷用 SQL：確認 Vault RPC function 是否存在
cleanup_orphan_vault_secrets.sql    診斷/清理用 SQL：清理孤兒 Vault secret
```

## 本地端安裝與執行

### 1. 環境需求

- Node.js 18.18 以上（建議使用 20 LTS）
- npm（隨 Node.js 附帶）
- 一組 Supabase 專案（含 Vault extension 已啟用）
- 一組 Notion Integration（Public Integration，用於 OAuth）
- 一組 Google Cloud OAuth 用戶端（用於 Supabase Auth 的 Google 登入）

### 2. 下載專案並安裝套件

```bash
git clone <你的repo網址>
cd diet-tracker-webapp
npm install
```

### 3. 設定環境變數

在專案根目錄新建 `.env.local` 檔案，內容參考：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=你的Supabase專案URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=你的Supabase service role key

# Notion OAuth（在 Notion Integration 設定頁面取得）
NOTION_CLIENT_ID=你的Notion Client ID
NOTION_CLIENT_SECRET=你的Notion Client Secret

# 本地開發網址（Notion Redirect URI 需對應這個網址）
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Supabase 專案設定

- 到 Database → Extensions 確認 `supabase_vault` extension 已啟用
- 執行專案內的 SQL migration，建立 `notion_connections`、`oauth_states` 等資料表，
  以及 `set_notion_tokens`、`get_notion_tokens`、`delete_notion_tokens` 三個
  Postgres function（負責讀寫 Vault 裡加密的 token）
- 到 Authentication → Providers 啟用 Google，並填入 Google OAuth 用戶端資訊

### 5. Notion Integration 設定

- 到 [Notion Integrations](https://www.notion.so/my-integrations) 建立一個 Public Integration
- Redirect URI 填入：`http://localhost:3000/api/notion/oauth/callback`
- 記下 Client ID / Client Secret，填入 `.env.local`

### 6. 啟動本地開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 `http://localhost:3000`，使用 Google 帳號登入後，
到「設定」頁面點擊連接 Notion，完成授權後即可點擊「建立 Notion 資料結構」，
自動在你的 Notion 工作區建立「個人資料」「AI用PROMPT」「生理紀錄」「飲食紀錄」四個物件。

### 常用指令

```bash
npm run dev      # 啟動開發伺服器（http://localhost:3000）
npm run build    # 建置正式版本
npm run start    # 啟動已建置的正式版本
npm run lint     # 執行 ESLint 檢查
```

## 部署

專案設定為部署在 Vercel。正式站部署時記得：

- 在 Vercel 專案設定裡填入所有環境變數（同 `.env.local` 內容，`NEXT_PUBLIC_SITE_URL` 改為正式網域）
- 到 Notion Integration 設定頁面，額外新增一組正式網域版本的 Redirect URI
  （例如 `https://你的正式網域/api/notion/oauth/callback`）
- 到 Google Cloud OAuth 用戶端設定，新增正式網域到已授權的重新導向 URI

## 已知注意事項

- `browserslist` 已設定支援到 iOS/Safari 12 以上，確保較舊的 iPhone 也能正常執行按鈕互動
- Google 登入已設定 `prompt: 'select_account'`，每次登入都會顯示帳號選擇畫面，
  方便切換不同 Google 帳號
- 全站已透過 `viewport` 設定與 CSS `touch-action: manipulation` 避免手機上
  連續點擊按鈕時誤觸放大縮放

# 新增主題操作

說明如何在飲食管理小幫手（diet-tracker-webapp）裡新增一個介面主題（例如「春天」「夏天」或其他心情主題）。整套流程設計成**只需要編輯一支程式碼檔案**（`lib/theme/themes.ts`），其他地方會自動跟著變。

---

## 開始前你需要知道的事

主題系統由兩個部分組成：

| 部分 | 負責什麼 | 你會不會動到 |
|---|---|---|
| `lib/theme/themes.ts` | 主題清單、名稱、素材路徑、**顏色定義** | ✅ 會 |
| `public/images/theme/(主題id)/` | 該主題的圖片素材 | ✅ 會 |
| `app/globals.css`、`app/layout.tsx`、`ThemeContext.tsx`、`api/theme/route.ts`、`settings/theme/page.tsx` | 讀取/切換/儲存主題、以及把 `themes.ts` 的顏色動態注入畫面的邏輯 | ❌ 不用動 |

`app/layout.tsx`（Server Component）會在 render 時直接讀 `themes.ts` 裡的 `THEME_IDS` 跟 `generateThemeCss()`，動態產生 `<style>` 區塊跟防閃爍腳本要用的合法主題清單。這代表**顏色只有 `themes.ts` 這一份資料來源**，不會有兩邊對不齊的問題。

---

## Step 1：在 `themes.ts` 新增主題

決定一個主題 id（英文小寫、不能有空格），例如 `spring`。**id 一旦上線後不要再改**——改了會讓已經選過這個主題的舊使用者的紀錄失效，變回預設值。

打開 `lib/theme/themes.ts`，做兩件事：

**1-1. 把新 id 加進 `THEME_IDS`**

```ts
export const THEME_IDS = ['minimal', 'cute', 'cool', 'spring'] as const
//                                                     ^^^^^^^^ 新增這個
```

**1-2. 在 `THEMES` 物件裡補上完整設定，包含顏色**

```ts
export const THEMES: Record<ThemeId, ThemeConfig> = {
  minimal: { /* ... 不動 ... */ },
  cute: { /* ... 不動 ... */ },
  cool: { /* ... 不動 ... */ },
  spring: {
    id: 'spring',
    label: '春天',                        // 顯示在選擇頁面上的名稱
    assetsPath: '/images/theme/spring',    // 圖片資料夾路徑，要跟 Step 2 對得起來
    colors: {
      textStrong: '#2d3b2e',
      textBody: '#4a5d4c',
      textMuted: '#7c8f7e',
      textSubtle: '#a8bfa9',
      textDisabled: '#d4e2d5',
      bg: '#f3f9f0',
      surface: '#ffffff',
      surfaceMuted: '#e8f5e5',
      invertBg: '#4a7c4e',
      border: '#c8e0c9',
      borderLight: '#e0efdf',
      borderSubtle: '#f0f7ef',
      accent: '#66bb6a',
      accentHover: '#4caf50',
      accentSoft: '#e8f5e9',
    },
  },
}
```

`ThemeColors` 型別定義了 15 個固定欄位（`colors` 物件裡的 15 個 key），TypeScript 會強制檢查有沒有填齊，漏填會直接編譯錯誤，不用擔心漏東漏西。

**顏色怎麼挑比較不會踩雷：**
- `textStrong` 跟 `bg` 的對比度要夠（標題文字要看得清楚）
- `surface` 通常維持接近白色，除非是深色主題（像 `cool`）
- `accent` 是按鈕、連結、選中狀態的顏色，建議選一個飽和度夠、跟背景色系搭的顏色

存檔後**不用改 `globals.css` 或 `layout.tsx`**——`generateThemeCss()` 會在下次 build/render 時自動把這組顏色轉成 CSS 注入畫面。

---

## Step 2：準備圖片素材

在 `public/images/theme/` 底下新建一個跟 Step 1 id 同名的資料夾，裡面要放**四個固定檔名**的檔案（對應 `themes.ts` 裡的 `THEME_ASSET_SLOTS`）：

```
public/images/theme/spring/
  bg-home.png          首頁背景
  bg-dashboard.png     儀表板背景
  icon-meal.svg        飲食紀錄圖示
  icon-water.svg       喝水/生理紀錄圖示
```

**檔名一定要跟其他主題資料夾完全一致**（大小寫、副檔名都要一樣），程式碼是用固定路徑拼接的，檔名對不上會直接讀不到圖（畫面上會是破圖或空白，不會報錯，記得實際打開頁面肉眼確認）。

如果暫時沒有某個素材，可以：
- 先不放檔案，讓該主題那個位置暫時維持透明/純色背景，之後有素材再補
- 或是先用 `minimal` 的圖檔頂著，之後換掉

---

## Step 3：測試

1. `npm run dev` 啟動本機開發
2. 打開 `/settings/theme`，確認新主題有出現在選項卡片裡
3. 點選新主題，檢查：
   - 整個 App 的顏色有沒有正確切換（文字、背景、邊框、按鈕）
   - 重新整理頁面後主題有沒有保留（測試 localStorage 快取有沒有生效）
   - 換個瀏覽器/無痕視窗登入同帳號，確認主題有沒有跨裝置同步（測試 Supabase 有沒有正確存取）
4. 檢查有沒有破圖：切到新主題後，把每個有用到 `bg-home.png` / `icon-meal.svg` 等素材的頁面都點過一次
5. 打開瀏覽器開發者工具，檢查 `<head>` 裡的 `<style>` 標籤有沒有出現新的 `[data-theme='spring']` 區塊（確認 `generateThemeCss()` 有正確吃到新資料）