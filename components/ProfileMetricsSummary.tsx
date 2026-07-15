'use client'

// 設定頁專用：只顯示自動計算的四個關鍵指標(BMR/TDEE/BMI/每日飲水目標)，
// 完整表單(所有欄位、可編輯)請到 /profile 頁面查看
// 這四個數值本身就是 profile record 裡的快照欄位，直接用 useProfile 讀取即可，不用另外計算

import Link from 'next/link'
import { useProfile } from '@/lib/hooks/useNotionData'
import LoadingSpinner from './LoadingSpinner'

export default function ProfileMetricsSummary() {
  const { profile, isLoading } = useProfile()

  if (isLoading && !profile) {
    return <LoadingSpinner label="個人資料載入中..." emoji="👤" size="sm" />
  }

  if (!profile) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-subtle">尚未填寫個人資料</p>
        <Link href="/profile" className="inline-block text-sm text-accent hover:underline">
          前往填寫個人資料 →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-text-muted">基礎代謝率 BMR</p>
          <p className="text-xl font-bold">{profile.bmr ? `${profile.bmr} kcal` : '—'}</p>
        </div>
        <div>
          <p className="text-text-muted">每日總消耗 TDEE</p>
          <p className="text-xl font-bold">{profile.tdee ? `${profile.tdee} kcal` : '—'}</p>
        </div>
        <div>
          <p className="text-text-muted">BMI</p>
          <p className="text-xl font-bold">{profile.bmi ?? '—'}</p>
        </div>
        <div>
          <p className="text-text-muted">每日飲水目標</p>
          <p className="text-xl font-bold">{profile.waterTarget ? `${profile.waterTarget} ml` : '—'}</p>
        </div>
      </div>

      <Link href="/profile" className="inline-block text-sm text-accent hover:underline">
        查看/編輯完整個人資料 →
      </Link>
    </div>
  )
}
