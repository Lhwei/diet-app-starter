# 手機版底部導覽列 整合說明

## 新增檔案
- components/MobileBottomNav.tsx  底部固定導覽列（僅在手機/sm以下顯示）
- components/QuickAddSheet.tsx    點擊"+"跳出的選單（選飲食紀錄／生理紀錄）

## 1. 在全域 layout 掛上導覽列
找到 app/layout.tsx（或你目前放 SideNav 的地方），在 <body> 內加入：

    import MobileBottomNav from '@/components/MobileBottomNav'

    <SideNav />           {/* 桌面版原有導覽，不動 */}
    {children}
    <MobileBottomNav />   {/* 新增，只在 sm以下顯示，桌面自動隱藏 */}

MobileBottomNav 內部已經用 `sm:hidden` 處理，桌面版不會看到它，不需要額外判斷裝置。

## 2. 讓「飲食紀錄」「生理紀錄」頁面能被 ?new=1 觸發開表單

在 DietRecordList.tsx（及生理紀錄的對應清單元件）裡，找到讀取 query string 的地方，
加入類似這段邏輯（用 useSearchParams）：

    import { useSearchParams, useRouter } from 'next/navigation'

    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
      if (searchParams.get('new') === '1') {
        setShowForm(true)
        router.replace('/diet')  // 清掉 query，避免重新整理又跳出表單
      }
    }, [searchParams])

## 3. 移除頁面內原本的「+ 新增飲食紀錄」按鈕

DietRecordList.tsx 裡原本這段（在週曆或列表上方）：

    <button onClick={() => setShowForm(true)}>+ 新增飲食紀錄</button>

直接刪除。新增功能完全由底部導覽列的"+"取代，避免同一功能出現兩個入口造成混淆。
生理紀錄頁面若有相同的「+ 新增生理紀錄」按鈕，做法相同，一併移除。

## 4. 導覽順序與行為

飲食紀錄 → 儀表板 → ＋新增(跳出選單) → 遊戲(disabled,尚未製作,淺灰色不可點) → 設定

"+"按鈕本身不是連結，點擊後彈出 QuickAddSheet（底部彈出選單），選「飲食紀錄」或「生理紀錄」後，
會導向對應頁面並帶上 ?new=1，該頁面偵測到後自動開啟新增表單。
