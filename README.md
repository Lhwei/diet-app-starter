# 前端體感優化套用說明

## 1. 安裝SWR套件
npm install swr

## 2. 已包含的檔案
- app/dashboard/loading.tsx, app/profile/loading.tsx, app/diet/loading.tsx, app/physio/loading.tsx
  -> Next.js切頁時立即顯示骨架屏，不會有空白等待
- lib/hooks/useNotionData.ts
  -> useProfile() / useDietRecords() / usePhysioRecords() / useWeightProjection()
  -> 內建SWR：先顯示舊資料(keepPreviousData)，背景重新驗證，30秒內重複請求直接吃快取
- components/DashboardContent.tsx
  -> 示範如何使用上面的hooks，並在新增/更新資料後呼叫refresh()立即更新畫面
- components/SideNav.tsx
  -> 示範用 <Link prefetch={true}> 讓使用者滑過/點擊前就先偷偷載入下一頁資料

## 3. 需要隊長自行調整的地方
- ProfileForm / WeightProjectionCard 這兩個既有元件的props介面，
  天天示範的DashboardContent.tsx假設它們接受 (profile, isLoading, onSaved) 這種props，
  實際簽名可能不同，請對照隊長現有元件調整。
- 如果隊長專案裡有其他地方是用 fetch('/api/xxx') 直接呼叫API的，
  建議統一改成呼叫 useNotionData.ts 裡對應的hook，這樣才能吃到SWR的快取跟自動更新機制。
- 新增/更新/刪除資料的表單元件，記得在API呼叫成功後呼叫對應的 refresh()（例如 refreshDiet()），
  這樣才能讓SWR立刻用最新資料更新畫面，而不是等到下次瀏覽器分頁切回來才自動重新驗證。

## 4. 三層快取搭配後的效果
- 後端 lib/notion/queryCache.ts : 60秒內，同一份資料不重打Notion API
- 前端 SWR (dedupingInterval 30秒) : 30秒內，同一份資料不重打伺服器API
- <Link prefetch> : 使用者點擊前，資料已經在背景抓好
- loading.tsx : 資料還沒回來前，畫面不會空白，有骨架屏過渡

這四層疊加起來，正常操作流程下，切換頁面應該幾乎沒有明顯等待感。
