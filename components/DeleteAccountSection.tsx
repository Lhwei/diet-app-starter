'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 刪除帳號確認元件
// 規格要求：文案需明確告知使用者「Notion中的實際內容不受本App控制」

export default function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const CONFIRM_WORD = '刪除我的帳號'
  const canConfirm = confirmText === CONFIRM_WORD

  const handleDelete = async () => {
    if (!canConfirm) return
    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || '刪除失敗，請稍後再試')
        setIsDeleting(false)
        return
      }

      // 刪除成功，導向登出/首頁
      router.push('/')
    } catch (e) {
      setError('刪除失敗，請檢查網路連線後再試')
      setIsDeleting(false)
    }
  }

  return (
    <section className="rounded-xl border border-danger-soft bg-danger-soft p-6 space-y-4">
      <h2 className="text-lg font-semibold text-danger-hover">刪除帳號</h2>

      <p className="text-sm text-text-muted">
        刪除帳號後，我們會清除您在本App中儲存的所有資料，包括已加密的Notion授權資訊。
        此操作無法復原。若原帳號、原Notion帳號重新使用，可選擇連結未刪除的原有頁面和資料庫，若原有頁面和資料庫已刪除，則將建立新的頁面和資料庫。
      </p>

      <p className="text-sm text-text-muted font-medium">
        請注意：您Notion workspace中原有的頁面與資料庫（個人資料、生理紀錄、飲食紀錄等）
        <span className="text-danger">不會被刪除</span>，仍會保留在您自己的notion帳號中，
        本App僅移除連結與存取權限。
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger-hover"
        >
          我要刪除帳號
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm text-text-body">
            請輸入「{CONFIRM_WORD}」以確認：
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            placeholder={CONFIRM_WORD}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={!canConfirm || isDeleting}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting ? '刪除中...' : '確認永久刪除'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false)
                setConfirmText('')
                setError(null)
              }}
              disabled={isDeleting}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-body hover:bg-surface-muted"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
