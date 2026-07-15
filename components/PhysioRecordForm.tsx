'use client'

// 生理紀錄新增/編輯表單 —— 重新設計版
//
// 本次異動：onSuccess 改為回傳「實際存入的記錄日期」savedDateKey('YYYY-MM-DD')。
// 原因：這支表單允許使用者把記錄日期改到別的一天（補登過去健檢報告數值），
// 父層 PhysioRecordList.tsx 需要這個日期才能正確呼叫 invalidatePhysioCaches(date)，
// 讓 usePhysioRecordsByDate(date)（例如DietRecordList算當日飲水量用的）跟
// usePhysioSummary/weight-projection 一起刷新，不然只有這支列表自己的分頁
// 快取會更新，其他頁面繼續顯示舊資料。
//
// 本次異動（UI-only，資料邏輯完全不動）：
// 「取消/儲存」按鈕改為固定釘在畫面底部，手機版跟桌面版都固定（跟
// DietRecordForm.tsx 採用相同模式），理由相同：這支表單欄位很多（時段、
// 體位、心血管、血糖代謝、生活習慣、還有可展開的健檢類數值），使用者
// 填寫過程中不需要滑到最底才能點儲存/取消。
//
// ⚠️ 原本整個表單是一張卡片（bg-surface rounded-2xl shadow-sm p-6 包住
// 整個 <form>），這次把卡片樣式收進「表單主體」內層 div，按鈕區塊獨立
// 成固定底部區塊，兩者都仍在同一個 <form> 標籤內（提交按鈕 type="submit"
// 需要在 <form> 內才能正確觸發 handleSubmit)。
//
// ⚠️ 手機版 bottom-14 是為了不被 MobileBottomNav 蓋住（假設其高度為
// 標準 h-14/h-16，fixed bottom-0 定位）；桌面版 md:bottom-0 貼齊螢幕
// 底部，前提是桌面板沒有底部導航列。若 MobileBottomNav 實際高度不同或
// 桌面板也有底部導航，這兩個數值需要對應調整。
//
// ⚠️ 表單主體補上 pb-[6rem] md:pb-[8rem]，預留底部固定按鈕區的高度，
// 避免「健檢類數值」展開後最下方內容被蓋住點不到。這是估算值，如果按鈕
// 區塊本身高度之後有變動（例如加了其他元素），這個 padding 需要同步調整。

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
      <label className="block text-sm font-medium text-text-body mb-2">{label}</label>
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
                  ? 'bg-invert-bg text-white border-invert-bg'
                  : 'bg-surface text-text-muted border-border hover:border-border'
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
      <label className="block text-sm font-medium text-text-body mb-2">{label}</label>
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
                  ? 'bg-invert-bg text-white border-invert-bg'
                  : 'bg-surface text-text-muted border-border hover:border-border'
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
      <label className="block text-xs text-text-muted mb-1.5">{label}</label>
      <input
        type="number"
        step="any"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm rounded-lg border border-border px-3 py-2"
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
    <form onSubmit={handleSubmit} className="relative">
      {/* 表單主體：原本的卡片樣式（bg-surface rounded-2xl shadow-sm p-6）
          收進這裡，底部補 padding 讓出固定按鈕區的空間 */}
      <div className="space-y-7 bg-surface rounded-2xl shadow-sm p-6 pb-[6rem] md:pb-[8rem]">
        {error && <div className="bg-danger text-danger text-sm rounded-lg px-4 py-2">{error}</div>}

        <section className="space-y-2">
          <label className="block text-sm font-medium text-text-body">記錄日期時間</label>
          <input
            type="datetime-local"
            value={recordDateTime}
            onChange={(e) => setRecordDateTime(e.target.value)}
            className="w-full sm:w-auto text-sm rounded-lg border border-border px-3 py-2"
          />
          <p className="text-xs text-text-subtle">預設為目前時間，若要補登之前健檢報告的數值，可以手動改成報告上的日期</p>
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
              <p className="text-xs text-text-subtle">
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
              <h3 className="text-sm font-semibold text-text-strong">{group}</h3>
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
          <section className="pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-text-subtle hover:text-text-muted"
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
                      <h4 className="text-xs font-medium text-text-subtle">{group}</h4>
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
      </div>

      {/* 固定底部區塊：取消/儲存按鈕，手機版跟桌面版都固定，
          與 DietRecordForm.tsx 的固定底部按鈕採用相同模式與數值。
          z-30 手機版桌面版都保留，避免 fixed 元素在缺少明確 z-index 時
          被頁面上其他有設定 z-index 的元素（Modal、Toast等）意外蓋住。 */}
      <div className="fixed bottom-14 inset-x-0 z-30 bg-surface border-t border-border-subtle px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:bottom-0 md:bg-background md:pt-4 md:pb-10">
        <div className="flex gap-3 md:max-w-2xl md:mx-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-sm rounded-lg px-4 py-2.5 border border-border text-text-muted hover:bg-background bg-surface"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 text-sm rounded-lg px-4 py-2.5 bg-invert-bg text-white hover:bg-invert-bg disabled:opacity-50"
          >
            {submitting ? '儲存中...' : isEditing ? '更新紀錄' : '新增紀錄'}
          </button>
        </div>
      </div>
    </form>
  )
}