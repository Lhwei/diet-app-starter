'use client'

// 飲食紀錄新增/編輯表單
//
// 本次重新設計重點：
// 1. 餐別依目前時間自動建議（suggestMealTypeByTime），使用者仍可手動點選其他餐別覆蓋
// 2. 六大類食物份數改用 +/- 按鈕（一次0.5份），同時保留輸入框可直接手動輸入任意數字
// 3. 原本的下拉式 <select>（餐別/飽足感/油脂感知/精神睏意/量測方式/場景來源）全部改成
//    「點擊式選項卡」（外觀類似 multi_select 的 chip group，但仍是單選 select 語意）
// 4. 資訊層級重新分區：基本資訊 → 六大類食物 → 營養小計(自動計算,只讀) → 補充生理數值 → 身心感知 → 情境與備註
//    每個分區用小標題 + 說明文字區隔，讀取重要性依序遞減

import { useEffect, useState } from 'react'
import { dietFields } from '@/lib/notion/dietFieldsConfig'
import { calculateNutritionFromServings, foodGroupNutrition, suggestMealTypeByTime } from '@/lib/nutrition/foodGroupNutrition'

interface DietRecordFormProps {
  initialValues?: Record<string, any>
  onSaved: () => void
  onCancel: () => void
}

const fieldByKey = Object.fromEntries(dietFields.map((f) => [f.key, f]))

function SingleChipSelect({
  label,
  options,
  value,
  onChange,
  required,
}: {
  label: string
  options: string[]
  value: string | undefined
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
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

function ServingStepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | ''
  onChange: (v: number | '') => void
}) {
  const numeric = Number(value) || 0

  function step(delta: number) {
    const next = Math.max(0, Math.round((numeric + delta) * 10) / 10)
    onChange(next)
  }

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => step(-0.5)}
          className="w-8 h-8 shrink-0 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
          aria-label={`${label} 減少0.5份`}
        >
          −
        </button>
        <input
          type="number"
          step="0.5"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full text-center text-sm rounded-lg border border-gray-300 px-2 py-1.5"
        />
        <button
          type="button"
          onClick={() => step(0.5)}
          className="w-8 h-8 shrink-0 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
          aria-label={`${label} 增加0.5份`}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function DietRecordForm({ initialValues, onSaved, onCancel }: DietRecordFormProps) {
  const isEditing = Boolean(initialValues?.id)

  const [values, setValues] = useState<Record<string, any>>(() => ({
    mealType: suggestMealTypeByTime(),
    ...initialValues,
  }))
  const [mealTypeTouched, setMealTypeTouched] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateValue(key: string, value: any) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (isEditing || mealTypeTouched) return
    const timer = setInterval(() => {
      updateValue('mealType', suggestMealTypeByTime())
    }, 60000)
    return () => clearInterval(timer)
  }, [isEditing, mealTypeTouched])

  const servingsValues = Object.fromEntries(
    foodGroupNutrition.map((g) => [g.key, Number(values[g.key]) || 0])
  )
  const computed = calculateNutritionFromServings(servingsValues)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        ...values,
        protein: computed.protein,
        fat: computed.fat,
        carb: computed.carb,
        calories: computed.calories,
        ratioText: computed.ratioText,
      }

      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing ? { pageId: initialValues!.id, ...payload } : payload

      const res = await fetch('/api/diet', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errBody = await res.json()
        throw new Error(errBody.error || '儲存失敗')
      }

      onSaved()
    } catch (err: any) {
      setError(err.message || '發生錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">{error}</div>}

      <section className="space-y-4">
        <SingleChipSelect
          label={fieldByKey.mealType.label}
          options={fieldByKey.mealType.options!}
          value={values.mealType}
          onChange={(v) => {
            setMealTypeTouched(true)
            updateValue('mealType', v)
          }}
          required
        />
        {!isEditing && !mealTypeTouched && (
          <p className="text-xs text-gray-400 -mt-2">已依目前時間自動選擇「{values.mealType}」，可點選其他選項手動調整</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {fieldByKey.foodContent.label} <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={values.foodContent ?? ''}
            onChange={(e) => updateValue('foodContent', e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2"
            placeholder="例如：燕麥牛奶、蛋、香蕉、花椰菜"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">六大類食物（份）</h3>
          <p className="text-xs text-gray-400 mt-0.5">用按鈕以0.5份為單位調整，也可以直接點輸入框手動輸入</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {foodGroupNutrition.map((group) => (
            <ServingStepper
              key={group.key}
              label={fieldByKey[group.key].label}
              value={values[group.key] ?? ''}
              onChange={(v) => updateValue(group.key, v)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-gray-50 px-4 py-3.5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-gray-500">自動計算（依六大類份數換算，不可手動編輯）</span>
          <span className="text-lg font-bold text-gray-900">{computed.calories}<span className="text-xs font-normal text-gray-400 ml-1">kcal</span></span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs rounded-md px-2 py-1 font-medium bg-white text-gray-600 border border-gray-200">蛋白質 {computed.protein}g</span>
          <span className="text-xs rounded-md px-2 py-1 font-medium bg-white text-gray-600 border border-gray-200">脂質 {computed.fat}g</span>
          <span className="text-xs rounded-md px-2 py-1 font-medium bg-white text-gray-600 border border-gray-200">碳水 {computed.carb}g</span>
          {computed.ratioText && (
            <span className="text-xs rounded-md px-2 py-1 font-medium bg-white text-gray-500 border border-gray-200">{computed.ratioText}</span>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">補充生理數值</h3>
        <div className="grid grid-cols-2 gap-4">
          {['fiber', 'sodium', 'bloodSugar'].map((key) => (
            <div key={key} className={key === 'bloodSugar' ? 'col-span-2' : ''}>
              <label className="block text-xs text-gray-500 mb-1.5">{fieldByKey[key].label}</label>
              <input
                type="number"
                value={values[key] ?? ''}
                onChange={(e) => updateValue(key, e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">身心感知</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SingleChipSelect
            label={fieldByKey.fullness.label}
            options={fieldByKey.fullness.options!}
            value={values.fullness}
            onChange={(v) => updateValue('fullness', v)}
          />
          <SingleChipSelect
            label={fieldByKey.oiliness.label}
            options={fieldByKey.oiliness.options!}
            value={values.oiliness}
            onChange={(v) => updateValue('oiliness', v)}
          />
          <SingleChipSelect
            label={fieldByKey.alertness.label}
            options={fieldByKey.alertness.options!}
            value={values.alertness}
            onChange={(v) => updateValue('alertness', v)}
          />
          <SingleChipSelect
            label={fieldByKey.measureMethod.label}
            options={fieldByKey.measureMethod.options!}
            value={values.measureMethod}
            onChange={(v) => updateValue('measureMethod', v)}
          />
        </div>
        <MultiChipSelect
          label={fieldByKey.discomfort.label}
          options={fieldByKey.discomfort.options!}
          value={Array.isArray(values.discomfort) ? values.discomfort : []}
          onChange={(v) => updateValue('discomfort', v)}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">情境與備註</h3>
        <SingleChipSelect
          label={fieldByKey.scene.label}
          options={fieldByKey.scene.options!}
          value={values.scene}
          onChange={(v) => updateValue('scene', v)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{fieldByKey.note.label}</label>
          <textarea
            rows={3}
            value={values.note ?? ''}
            onChange={(e) => updateValue('note', e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      </section>

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
          {submitting ? '儲存中...' : isEditing ? '儲存變更' : '新增紀錄'}
        </button>
      </div>
    </form>
  )
}
