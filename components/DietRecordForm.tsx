'use client'

// 飲食紀錄新增/編輯表單
//
// 本次異動重點：
// 1. 新增「記錄日期時間」欄位（可補登過去日期時間）
// 2. 新增「額外攝取」區塊：糖(份)、酒精(酒類+ml)、咖啡因(來源+杯數)，放在六大類食物下方
//    - 糖：計入碳水化合物與總熱量（比照水果類單位：1份=15g碳水=60大卡）
//    - 酒精：使用者填「酒類」+「飲用量ml」（喝下去的酒飲總量，不是純酒精量），
//      程式依酒類自動帶入濃度換算熱量。酒精熱量計入總熱量，但不計入三大營養素比例
//      （因為酒精不是蛋白質/脂質/碳水任何一種巨量營養素）
//    - 咖啡因：純紀錄用途，無熱量，不影響任何計算
// 3. 改用 calculateFullDietNutrition()（取代原本的 calculateNutritionFromServings()）
//    統一計算六大類+糖+酒精的熱量與三大營養素比例，一次算好，避免表單/儀表板各算一套
// 4. onSuccess 改為回傳「實際存入的記錄日期」savedDateKey('YYYY-MM-DD')。
//    原因：這支表單允許使用者把記錄日期改到別的一天（例如把 7/12 的紀錄
//    改成 7/13），若 onSuccess 不帶出實際存檔的日期，父層（DietRecordList）
//    只知道使用者「目前在看哪一天」，沒辦法判斷新日期是否也需要一起刷新
//    SWR 快取，導致跨日編輯後其中一天顯示過期資料。這支表單本身仍然是
//    純寫入元件，不使用 SWR；SWR 只用於讀取，寫入完全交由父層的
//    invalidateDietCaches() 處理。

import { useEffect, useState } from 'react'
import { dietFields } from '@/lib/notion/dietFieldsConfig'
import {
  calculateFullDietNutrition,
  foodGroupNutrition,
  suggestMealTypeByTime,
} from '@/lib/nutrition/foodGroupNutrition'
import PortionGuideHint from '@/components/PortionGuideHint'

interface DietRecordFormProps {
  initialValues?: Record<string, any>
  recordId?: string
  onSuccess: (savedDateKey: string) => void
  onCancel: () => void
}

const fieldByKey = Object.fromEntries(dietFields.map((f) => [f.key, f]))

function toDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseRecordDate(value: any): Date {
  if (!value) return new Date()
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

// 從記錄日期時間算出對應的 'YYYY-MM-DD' 日期字串，用於跨日編輯後
// 通知父層該刷新哪個單日 SWR 快取。直接取 toDateTimeInputValue() 的前10字元，
// 避免另外用 toISOString() 造成時區位移（toDateTimeInputValue 是依本地時間格式化）。
function toDateKey(date: Date): string {
  return toDateTimeInputValue(date).slice(0, 10)
}

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

export default function DietRecordForm({ initialValues, onSuccess, onCancel }: DietRecordFormProps) {
  const isEditing = Boolean(initialValues?.id)

  const [values, setValues] = useState<Record<string, any>>(() => ({
    mealType: suggestMealTypeByTime(),
    ...initialValues,
  }))
  const [recordDateTime, setRecordDateTime] = useState<string>(() =>
    toDateTimeInputValue(parseRecordDate(initialValues?.recordDate))
  )
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

  // 統一計算：六大類 + 糖 + 酒精，一次算出總熱量、三大營養素比例、酒精熱量
  const computed = calculateFullDietNutrition(values)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const savedDate = parseRecordDate(recordDateTime)
      const savedDateKey = toDateKey(savedDate)

      const payload = {
        ...values,
        recordDate: savedDate.toISOString(),
        protein: computed.protein,
        fat: computed.fat,
        carb: computed.carb,
        calories: computed.calories,
        ratioText: computed.ratioText,
        alcoholCalories: computed.alcoholCalories,
      }

      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing ? { pageId: initialValues!.id, ...payload } : payload

      const res = await fetch('/api/diet', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || errBody.message || '儲存失敗')
      }

      // 把「實際存入的記錄日期」回傳給父層，讓父層判斷是否需要同時刷新
      // 舊日期與新日期兩個 SWR 快取（例如編輯時把日期改到別的一天）。
      onSuccess(savedDateKey)
    } catch (err: any) {
      setError(err.message || '發生錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">{error}</div>}

      <section className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">記錄日期時間</label>
        <input
          type="datetime-local"
          value={recordDateTime}
          onChange={(e) => setRecordDateTime(e.target.value)}
          className="w-full sm:w-auto text-sm rounded-lg border border-gray-300 px-3 py-2"
        />
        <p className="text-xs text-gray-400">預設為目前時間，若要補登之前吃的一餐，可以手動改成實際用餐的日期時間</p>
      </section>

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
          <PortionGuideHint />
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

      {/* 額外攝取：糖/酒精會計入熱量與碳水/酒精熱量計算，咖啡因純紀錄不影響任何計算 */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">額外攝取（選填）</h3>
          <p className="text-xs text-gray-400 mt-0.5">糖與酒精會計入總熱量，咖啡因僅作紀錄不計熱量</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ServingStepper
            label={fieldByKey.sugarDrink.label}
            value={values.sugarDrink ?? ''}
            onChange={(v) => updateValue('sugarDrink', v)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SingleChipSelect
            label={fieldByKey.alcoholType.label}
            options={fieldByKey.alcoholType.options!}
            value={values.alcoholType}
            onChange={(v) => updateValue('alcoholType', v)}
          />
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{fieldByKey.alcohol.label}（喝下去的總量，非純酒精量）</label>
            <input
              type="number"
              min="0"
              value={values.alcohol ?? ''}
              onChange={(e) => updateValue('alcohol', e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2"
              placeholder="例如：一杯啤酒約350ml"
            />
          </div>
        </div>
        {computed.alcoholCalories > 0 && (
          <p className="text-xs text-amber-600">依所選酒類自動換算，本次酒精熱量約 {computed.alcoholCalories} kcal</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SingleChipSelect
            label={fieldByKey.caffeineSource.label}
            options={fieldByKey.caffeineSource.options!}
            value={values.caffeineSource}
            onChange={(v) => updateValue('caffeineSource', v)}
          />
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{fieldByKey.caffeineServings.label}</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={values.caffeineServings ?? ''}
              onChange={(e) => updateValue('caffeineServings', e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-gray-50 px-4 py-3.5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-gray-500">自動計算（依六大類+糖+酒精換算，不可手動編輯）</span>
          <span className="text-lg font-bold text-gray-900">{computed.calories}<span className="text-xs font-normal text-gray-400 ml-1">kcal</span></span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs rounded-md px-2 py-1 font-medium bg-white text-gray-600 border border-gray-200">蛋白質 {computed.protein}g</span>
          <span className="text-xs rounded-md px-2 py-1 font-medium bg-white text-gray-600 border border-gray-200">脂質 {computed.fat}g</span>
          <span className="text-xs rounded-md px-2 py-1 font-medium bg-white text-gray-600 border border-gray-200">碳水 {computed.carb}g</span>
          {computed.alcoholCalories > 0 && (
            <span className="text-xs rounded-md px-2 py-1 font-medium bg-white text-amber-600 border border-amber-200">酒精 {computed.alcoholCalories}kcal</span>
          )}
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