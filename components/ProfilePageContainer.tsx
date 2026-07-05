'use client'

import { useEffect, useState } from 'react'
import ProfileForm from './ProfileForm'
import LoadingSpinner from './LoadingSpinner'

export default function ProfilePageContainer() {
  const [record, setRecord] = useState<Record<string, any> | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error || '讀取失敗')
        }
        const data = await res.json()
        setRecord(data.record)
      } catch (err: any) {
        setError(err.message)
      }
    }
    load()
  }, [])

  if (error === 'notion_not_ready') {
    return (
      <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
        Notion 尚未完成連結或初始化，請先到「設定」頁面完成 Notion 連結。
      </div>
    )
  }

  if (error) return <p className="text-red-600">讀取失敗：{error}</p>

  if (record === undefined) return <LoadingSpinner />

  return (
    <ProfileForm
      initialValues={record ?? {}}
      onSaved={() => {
        // 儲存成功後重新整理當前狀態即可，表單本身已經是最新資料
      }}
    />
  )
}
