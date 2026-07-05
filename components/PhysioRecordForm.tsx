'use client'

import { useState } from 'react'
import { physioFields, physioFieldGroups } from '@/lib/notion/physioFieldsConfig'

interface PhysioRecordFormProps {
  initialValues?: Record<string, any>
  recordId?: string
  onSuccess: () => void
  onCancel: () => void
}

export default function PhysioRecordForm({ initialValues, recordId, onSuccess, onCancel }: PhysioRecordFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues ?? {})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateValue(key: string, value: any) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function toggleMultiSelect(key: string, option: string) {
    const current: string[] = Array.isArray(values[key]) ? values[key] : []
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option]
    updateValue(key, next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const recordDate = initialValues?.recordDate || new Date().toLocaleString('zh-TW')
    const payload = { ...values, recordDate }

    try {
      const res = await fetch(recordId ? `/api/physio/${recordId}` : '/api/physio', {
        method: recordId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || '儲存失敗')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || '發生錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl shadow-sm p-6">
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">{error}</div>}

      {physioFieldGroups.map((group) => (
        <div key={group}>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">{group}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {physioFields.filter((f) => f.group === group).map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>

                {field.type === 'select' && (
                  <select
                    value={values[field.key] ?? ''}
                    onChange={(e) => updateValue(field.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">請選擇</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'multi_select' && (
                  <div className="flex flex-wrap gap-2">
                    {field.options?.map((opt) => {
                      const selected = Array.isArray(values[field.key]) && values[field.key].includes(opt)
                      return (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => toggleMultiSelect(field.key, opt)}
                          className={`text-sm rounded-full px-3 py-1 border ${
                            selected ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-600'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    step="any"
                    value={values[field.key] ?? ''}
                    onChange={(e) => updateValue(field.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white rounded-xl px-5 py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {submitting ? '儲存中...' : recordId ? '更新紀錄' : '新增紀錄'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-5 py-2.5 font-medium border border-gray-300 hover:bg-gray-50 transition"
        >
          取消
        </button>
      </div>
    </form>
  )
}
