'use client'

import { useEffect, useState } from 'react'
import { profileFields, profileFieldGroups } from '@/lib/notion/profileFieldsConfig'
import { calculateBmr, calculateTdee, calculateBmi, suggestCalorieTarget, calculateWaterTargetRange } from '@/lib/nutrition/metabolicCalc'
import MacroRatioSlider from './MacroRatioSlider'

interface ProfileFormProps {
  initialValues: Record<string, any>
  onSaved: () => void
}

export default function ProfileForm({ initialValues, onSaved }: ProfileFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues ?? {})
  const [calorieTargetTouched, setCalorieTargetTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function updateValue(key: string, value: any) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function toggleMultiSelect(key: string, option: string) {
    const current: string[] = Array.isArray(values[key]) ? values[key] : []
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option]
    updateValue(key, next)
  }

  const bmr = calculateBmr({
    gender: values.gender,
    weightKg: Number(values.startWeight),
    heightCm: Number(values.heightCm),
    birthDate: values.birthDate,
  })
  const tdee = calculateTdee(bmr, values.activityFactor)
  const bmi = calculateBmi(Number(values.startWeight), Number(values.heightCm))
  const waterRange = calculateWaterTargetRange(Number(values.startWeight))
  const suggestedCalorieTarget = suggestCalorieTarget(tdee, values.targetMode)

  useEffect(() => {
    setValues((prev) => ({
      ...prev,
      bmr: bmr ?? undefined,
      tdee: tdee ?? undefined,
      bmi: bmi ?? undefined,
      waterTarget: waterRange?.suggested ?? undefined,
    }))
  }, [bmr, tdee, bmi, waterRange?.suggested])

  useEffect(() => {
    if (!calorieTargetTouched && suggestedCalorieTarget !== null) {
      setValues((prev) => ({ ...prev, calorieTarget: suggestedCalorieTarget }))
    }
  }, [suggestedCalorieTarget, calorieTargetTouched])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || '儲存失敗')
      }

      const data = await res.json()
      setValues(data.record)
      setSaved(true)
      onSaved()
    } catch (err: any) {
      setError(err.message || '發生錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">{error}</div>}
      {saved && <div className="bg-green-50 text-green-600 text-sm rounded-lg px-4 py-2">已儲存！</div>}

      <div className="bg-blue-50 rounded-2xl p-5 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-gray-500">基礎代謝率 BMR</p>
          <p className="text-xl font-bold">{bmr ? `${bmr} kcal` : '—'}</p>
        </div>
        <div>
          <p className="text-gray-500">每日總消耗 TDEE</p>
          <p className="text-xl font-bold">{tdee ? `${tdee} kcal` : '—'}</p>
        </div>
        <div>
          <p className="text-gray-500">BMI</p>
          <p className="text-xl font-bold">{bmi ? bmi : '—'}</p>
        </div>
        <div>
          <p className="text-gray-500">每日飲水目標</p>
          <p className="text-xl font-bold">{waterRange ? `${waterRange.suggested} ml` : '—'}</p>
          {waterRange && <p className="text-xs text-gray-400">範圍 {waterRange.min}~{waterRange.max}ml</p>}
        </div>
        <p className="text-xs text-gray-400 w-full mt-1">
          填完性別/身高/出生日期/起始體重/日常活動係數後即時計算，儲存時會一併寫入快照欄位（此四項為固定公式，無法手動編輯）
        </p>
      </div>

      {profileFieldGroups.map((group) => (
        <div key={group}>
          {group !== '自動計算快照' && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">{group}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-2xl shadow-sm p-5 mb-2">
                {profileFields.filter((f) => f.group === group).map((field) => (
                  <div
                    key={field.key}
                    className={field.type === 'multi_select' || field.key === 'macroRatioTarget' ? 'sm:col-span-2' : ''}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.readOnly && <span className="text-gray-400 text-xs ml-1">(固定計算)</span>}
                      {field.autoSuggested && <span className="text-blue-500 text-xs ml-1">(自動建議，可調整)</span>}
                    </label>
                    {field.helperText && <p className="text-xs text-gray-400 mb-1">{field.helperText}</p>}

                    {field.key === 'macroRatioTarget' ? (
                      <MacroRatioSlider
                        dietMode={values.dietMode}
                        value={values.macroRatioTarget}
                        onChange={(text) => updateValue('macroRatioTarget', text)}
                      />
                    ) : (
                      <>
                        {field.type === 'title' && (
                          <input
                            type="text"
                            value={values[field.key] ?? ''}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            required={field.required}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        )}

                        {field.type === 'select' && (
                          <select
                            value={values[field.key] ?? ''}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            required={field.required}
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
                            onChange={(e) => {
                              updateValue(field.key, e.target.value)
                              if (field.key === 'calorieTarget') setCalorieTargetTouched(true)
                            }}
                            required={field.required}
                            readOnly={field.readOnly}
                            className={`w-full rounded-lg border px-3 py-2 text-sm ${
                              field.readOnly ? 'bg-gray-50 border-gray-200 text-gray-500' : 'border-gray-300'
                            }`}
                          />
                        )}

                        {field.type === 'rich_text' && (
                          <textarea
                            value={values[field.key] ?? ''}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        )}

                        {field.type === 'date' && (
                          <input
                            type="date"
                            value={values[field.key] ?? ''}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            required={field.required}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="bg-black text-white rounded-xl px-6 py-3 font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {submitting ? '儲存中...' : '儲存個人資料'}
      </button>
    </form>
  )
}
