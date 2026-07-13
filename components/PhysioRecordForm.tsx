'use client'

// 生理紀錄新增/編輯表單 —— 重新設計版
//
// 本次異動：onSuccess 改為回傳「實際存入的記錄日期」savedDateKey('YYYY-MM-DD')。
// 原因：這支表單允許使用者把記錄日期改到別的一天（補登過去健檢報告數值），
// 父層 PhysioRecordList.tsx 需要這個日期才能正確呼叫 invalidatePhysioCaches(date)，
// 讓 usePhysioRecordsByDate(date)（例如DietRecordList算當日飲水量用的）跟
// usePhysioSummary/weight-projection 一起刷新，不然只有這支列表自己的分頁
// 快取會更新，其他頁面繼續顯示舊資料。

import { useEffect, useState } from 'react'
import { physioFields, physioFieldGroups } from '@/lib/notion/physioFieldsConfig'

interface PhysioRecordFormProps {
  initialValues?: Record<string, any>
  recordId?: string
  onSuccess: (savedDateKey: string) => void
  onCancel: () => void
}

function toDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseRecordDate(value: any): Date {
  if (!value) return new Date()
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

// 從記錄日期時間算出對應的 'YYYY-MM-DD' 日期字串，供父層呼叫 invalidatePhysioCaches(date) 用。
// 直接取 toDateTimeInputValue() 的前10字元，避免另外用 toISOString() 造成時區位移
// （toDateTimeInputValue 是依本地時間格式化，toISOString 是UTC）。
function toDateKey(date: Date): string {
  return toDateTimeInputValue(date).slice(0, 10)
}

function suggestTimeSlotByTime(date: Date = new Date()): string | null {
  const hour = date.getHours()
  if (hour >= 5 && hour < 9) return '晨起'
  if (hour >= 22 || hour < 5) return '睡前'
  return '其他'
}

function isTimeSlotField(options: string[] | undefined) {
  return Boolean(options && options.includes('晨起') && options.includes('睡前'))
}

function SingleChipSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string | undefined
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`text-sm rounded-full px-4 py-1.5 border transition-colors ${
                active
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MultiChipSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    const next = value.includes(opt) ? value.filter((o) => o !== opt) : [...value, opt]
    onChange(next)
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`text-sm rounded-full px-4 py-1.5 border transition-colors ${
                active
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: any
  onChange: (v: any) => void
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      <input
        type="number"
        step="any"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>
  )
}

function FieldControl({
  field,
  value,
  onChange,
  onTimeSlotTouched,
}: {
  field: any
  value: any
  onChange: (v: any) => void
  onTimeSlotTouched?: () => void
}) {
  if (field.type === 'select') {
    return (
      <SingleChipSelect
        label={field.label}
        options={field.options ?? []}
        value={value}
        onChange={(v) => {
          onTimeSlotTouched?.()
          onChange(v)
        }}
      />
    )
  }
  if (field.type === 'multi_select') {
    return (
      <MultiChipSelect
        label={field.label}
        options={field.options ?? []}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
      />
    )
  }
  return <NumberField label={field.label} value={value} onChange={onChange} />
}

const PRIMARY_GROUPS = ['時段', '體位', '心血管', '血糖代謝', '生活習慣']

export default function PhysioRecordForm({ initialValues, recordId, onSuccess, onCancel }: PhysioRecordFormProps) {
  const isEditing = Boolean(recordId)

  const timeSlotField = physioFields.find((f) => isTimeSlotField(f.options))

  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial = { ...initialValues }
    if (!isEditing && timeSlotField && !initial[timeSlotField.key]) {
      const suggested = suggestTimeSlotByTime()
      if (suggested) initial[timeSlotField.key] = suggested
    }
    return initial
  })
  const [recordDateTime, setRecordDateTime] = useState<string>(() =>
    toDateTimeInputValue(parseRecordDate(initialValues?.recordDate))
  )
  const [timeSlotTouched, setTimeSlotTouched] = useState(isEditing)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateValue(key: string, value: any) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (isEditing || timeSlotTouched || !timeSlotField) return
    const timer = setInterval(() => {
      const suggested = suggestTimeSlotByTime()
      if (suggested) updateValue(timeSlotField.key, suggested)
    }, 60000)
    return () => clearInterval(timer)
  }, [isEditing, timeSlotTouched, timeSlotField])

  const secondaryGroups = physioFieldGroups.filter((g) => !PRIMARY_GROUPS.includes(g))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const savedDate = parseRecordDate(recordDateTime)
    const savedDateKey = toDateKey(savedDate)
    const recordDate = savedDate.toISOString()
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

      onSuccess(savedDateKey)
    } catch (err: any) {
      setError(err.message || '發生錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7 bg-white rounded-2xl shadow-sm p-6">
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">{error}</div>}

      <section className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">記錄日期時間</label>
        <input
          type="datetime-local"
          value={recordDateTime}
          onChange={(e) => setRecordDateTime(e.target.value)}
          className="w-full sm:w-auto text-sm rounded-lg border border-gray-300 px-3 py-2"
        />
        <p className="text-xs text-gray-400">預設為目前時間，若要補登之前健檢報告的數值，可以手動改成報告上的日期</p>
      </section>

      {timeSlotField && (
        <section className="space-y-2">
          <FieldControl
            field={timeSlotField}
            value={values[timeSlotField.key]}
            onChange={(v) => updateValue(timeSlotField.key, v)}
            onTimeSlotTouched={() => setTimeSlotTouched(true)}
          />
          {!isEditing && !timeSlotTouched && (
            <p className="text-xs text-gray-400">
              已依目前時間自動選擇「{values[timeSlotField.key]}」，可點選其他選項手動調整（餐前/餐後請依實際用餐時間手動選擇）
            </p>
          )}
        </section>
      )}

      {PRIMARY_GROUPS.filter((g) => g !== '時段').map((group) => {
        const fields = physioFields.filter((f) => f.group === group && f !== timeSlotField)
        if (fields.length === 0) return null
        return (
          <section key={group} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">{group}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.key} className={field.type !== 'number' ? 'sm:col-span-2' : ''}>
                  <FieldControl
                    field={field}
                    value={values[field.key]}
                    onChange={(v) => updateValue(field.key, v)}
                  />
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {secondaryGroups.length > 0 && (
        <section className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            健檢類數值（選填，通常半年～一年量一次）
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-6">
              {secondaryGroups.map((group) => {
                const fields = physioFields.filter((f) => f.group === group)
                if (fields.length === 0) return null
                return (
                  <div key={group} className="space-y-3">
                    <h4 className="text-xs font-medium text-gray-400">{group}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {fields.map((field) => (
                        <div key={field.key} className={field.type !== 'number' ? 'sm:col-span-2' : ''}>
                          <FieldControl
                            field={field}
                            value={values[field.key]}
                            onChange={(v) => updateValue(field.key, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-sm rounded-lg px-4 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 text-sm rounded-lg px-4 py-2.5 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? '儲存中...' : isEditing ? '更新紀錄' : '新增紀錄'}
        </button>
      </div>
    </form>
  )
}