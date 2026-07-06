'use client'

// 包一層Client Component，串接 useProfile (SWR) 跟現有的 ProfileForm
// ProfileForm 本身不管資料怎麼來，只吃 initialValues + onSaved 這兩個prop，
// 所以在這裡負責「資料哪裡來、存檔後怎麼重新整理」，不用改動 ProfileForm.tsx 本身

import { useProfile } from '@/lib/hooks/useNotionData'
import ProfileForm from './ProfileForm'
import LoadingSpinner from './LoadingSpinner'

export default function ProfileSection() {
  const { profile, isLoading, refresh } = useProfile()

  if (isLoading && !profile) {
    return <LoadingSpinner label="個人資料載入中..." emoji="👤" />
  }

  return (
    <ProfileForm
      initialValues={profile ?? {}}
      onSaved={() => refresh()}
    />
  )
}
