'use client'

// 個人資料頁面容器
//
// 改用 useProfile() 取代原本的 useEffect + fetch('/api/profile')。
// 這支 hook 跟 DailyNutritionSummary.tsx、
// ProfileMetricsSummary.tsx 共用同一個 SWR key（'/api/profile'），
// 只要其中任何一個元件已經抓過資料，這裡會直接吃快取立刻顯示，不會重複發request。
//
// 儲存成功後呼叫 invalidateProfileCaches()，讓 profile、profile-target、
// weight-projection 三個相關快取一起失效重抓，避免其他頁面（例如飲食/生理
// 儀表板的目標值）繼續顯示使用者剛剛改掉的舊個人資料。

import ProfileForm from './ProfileForm'
import LoadingSpinner from './LoadingSpinner'
import { useProfile, invalidateProfileCaches } from '@/lib/hooks/useNotionData'

export default function ProfilePageContainer() {
  const { profile, isLoading, error } = useProfile()

  if (error?.message === 'notion_not_ready') {
    return (
      <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
        Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
      </div>
    )
  }

  if (error) return <p className="text-red-600">讀取失敗：{error.message}</p>

  // isLoading && profile === null：SWR 尚無可用資料，首次載入中。
  // 若已有快取（即使正在背景重新驗證），profile 不會是 null，不會卡在
  // LoadingSpinner，直接顯示上一次抓到的資料，這正是 SWR「先顯示舊資料
  // 再背景更新」的預期行為。
  if (isLoading && profile === null) return <LoadingSpinner />

  return (
    <ProfileForm
      initialValues={profile ?? {}}
      onSaved={() => {
        // 存檔成功後讓 profile、profile-target、weight-projection 的
        // SWR 快取一起失效重抓，避免其他頁面（飲食/生理儀表板的目標值、
        // 熱量目標等）繼續顯示已經被改掉的舊資料。
        void invalidateProfileCaches()
      }}
    />
  )
}