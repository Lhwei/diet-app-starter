'use client'

// 飲食紀錄新增/編輯表單
// （...原本檔案開頭的完整說明保持不變...）
//
// 本次異動（UI-only，資料邏輯完全不動）：
// 「自動計算熱量」區塊 + 「取消/儲存」按鈕，改為固定釘在畫面底部（僅手機板，
// md 以上還原成一般文件流）。原因：原本這兩塊排在表單最下方，使用者填寫
// 六大類份量、額外攝取時，得往下滑到最底才能看到即時熱量回饋，也才能點
// 儲存/取消，操作路徑太長、判斷也不直覺。改成固定在底部後，填表過程中
// 熱量數字跟兩個行動按鈕全程可見。
//
// ⚠️ 這兩塊釘在底部時，位置是 bottom-16（假設 MobileBottomNav 高度為
// 標準 h-16=64px 且用 fixed bottom-0 定位），確保不會被底部導航蓋住。
// 若 MobileBottomNav 實際高度不同，這個數值需要調整。
//
// ⚠️ 這兩塊雖然改成 fixed 定位，仍必須留在 <form> 元素內部——提交按鈕是
// type="submit"，需要在同一個 <form> 裡才能正確觸發 handleSubmit，
// 不能移到 <form> 標籤外面。
//
// ⚠️ 表單主體區塊補上 pb-[11rem]（手機板），預留底部固定區塊+導航列的
// 高度，避免最後的「情境與備註」欄位被蓋住點不到。這個數值是估算值
// （熱量區塊約7rem + 按鈕區約3rem + 上下留白約1rem），如果之後熱量區塊
// 內容變多變高，這個 padding 需要同步調整，否則會出現遮擋或多餘空白。

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
      <label className="block text-sm font-medium text-text-body mb-2">
        {label} {required && <span className="text-danger">*</span>}
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
      <label className="block text-xs text-text-muted mb-1.5">{label}</label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => step(-0.5)}
          className="w-8 h-8 shrink-0 rounded-lg border border-border text-text-muted hover:bg-background flex items-center justify-center text-lg leading-none"
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
          className="w-full text-center text-sm rounded-lg border border-border px-2 py-1.5"
        />
        <button
          type="button"
          onClick={() => step(0.5)}
          className="w-8 h-8 shrink-0 rounded-lg border border-border text-text-muted hover:bg-background flex items-center justify-center text-lg leading-none"
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

      onSuccess(savedDateKey)
    } catch (err: any) {
      setError(err.message || '發生錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* 表單主體：所有可滑動內容，底部預留空間給固定區塊+導航列，避免被蓋住 */}
      <div className="space-y-7 pb-[8rem] md:pb-[11rem]">
        {error && <div className="bg-danger text-danger text-sm rounded-lg px-4 py-2">{error}</div>}

        <section className="space-y-2">
          <label className="block text-sm font-medium text-text-body">記錄日期時間</label>
          <input
            type="datetime-local"
            value={recordDateTime}
            onChange={(e) => setRecordDateTime(e.target.value)}
            className="w-full sm:w-auto text-sm rounded-lg border border-border px-3 py-2"
          />
          <p className="text-xs text-text-subtle">預設為目前時間，若要補登之前吃的一餐，可以手動改成實際用餐的日期時間</p>
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
            <p className="text-xs text-text-subtle -mt-2">已依目前時間自動選擇「{values.mealType}」，可點選其他選項手動調整</p>
          )}

          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              {fieldByKey.foodContent.label} <span className="text-danger">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={values.foodContent ?? ''}
              onChange={(e) => updateValue('foodContent', e.target.value)}
              className="w-full text-sm rounded-lg border border-border px-3 py-2"
              placeholder="例如：燕麥牛奶、蛋、香蕉、花椰菜"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-strong">六大類食物（份）</h3>
            <p className="text-xs text-text-subtle mt-0.5">用按鈕以0.5份為單位調整，也可以直接點輸入框手動輸入</p>
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

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-strong">額外攝取（選填）</h3>
            <p className="text-xs text-text-subtle mt-0.5">糖與酒精會計入總熱量，咖啡因僅作紀錄不計熱量</p>
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
              <label className="block text-xs text-text-muted mb-1.5">{fieldByKey.alcohol.label}（喝下去的總量，非純酒精量）</label>
              <input
                type="number"
                min="0"
                value={values.alcohol ?? ''}
                onChange={(e) => updateValue('alcohol', e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-sm rounded-lg border border-border px-3 py-2"
                placeholder="例如：一杯啤酒約350ml"
              />
            </div>
          </div>
          {computed.alcoholCalories > 0 && (
            <p className="text-xs text-warning">依所選酒類自動換算，本次酒精熱量約 {computed.alcoholCalories} kcal</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SingleChipSelect
              label={fieldByKey.caffeineSource.label}
              options={fieldByKey.caffeineSource.options!}
              value={values.caffeineSource}
              onChange={(v) => updateValue('caffeineSource', v)}
            />
            <div>
              <label className="block text-xs text-text-muted mb-1.5">{fieldByKey.caffeineServings.label}</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={values.caffeineServings ?? ''}
                onChange={(e) => updateValue('caffeineServings', e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-sm rounded-lg border border-border px-3 py-2"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-text-strong">補充生理數值</h3>
          <div className="grid grid-cols-2 gap-4">
            {['fiber', 'sodium', 'bloodSugar'].map((key) => (
              <div key={key} className={key === 'bloodSugar' ? 'col-span-2' : ''}>
                <label className="block text-xs text-text-muted mb-1.5">{fieldByKey[key].label}</label>
                <input
                  type="number"
                  value={values[key] ?? ''}
                  onChange={(e) => updateValue(key, e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-border px-3 py-2"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-text-strong">身心感知</h3>
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
          <h3 className="text-sm font-semibold text-text-strong">情境與備註</h3>
          <SingleChipSelect
            label={fieldByKey.scene.label}
            options={fieldByKey.scene.options!}
            value={values.scene}
            onChange={(v) => updateValue('scene', v)}
          />
          <div>
            <label className="block text-sm font-medium text-text-body mb-2">{fieldByKey.note.label}</label>
            <textarea
              rows={3}
              value={values.note ?? ''}
              onChange={(e) => updateValue('note', e.target.value)}
              className="w-full text-sm rounded-lg border border-border px-3 py-2"
            />
          </div>
        </section>
      </div>

      {/* 固定底部區塊：熱量摘要 + 行動按鈕，僅手機板固定（md以上還原成一般文件流）。
          bottom-16 假設 MobileBottomNav 為標準 h-16 且 fixed bottom-0，
          若實際高度不同，需要調整這個數值。 */}
      <div className="fixed bottom-14 inset-x-0 z-30 bg-surface border-t border-border-subtle px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-3 md:bottom-0 md:bg-background md:pt-4 md:pb-10">
        <div className="md:max-w-2xl md:mx-auto space-y-3">
          <section className="rounded-xl bg-background px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs rounded-md px-2 py-1 font-medium bg-surface text-text-muted border border-border-light">蛋白質 {computed.protein}g</span>
                <span className="text-xs rounded-md px-2 py-1 font-medium bg-surface text-text-muted border border-border-light">脂質 {computed.fat}g</span>
                <span className="text-xs rounded-md px-2 py-1 font-medium bg-surface text-text-muted border border-border-light">碳水 {computed.carb}g</span>
                {computed.alcoholCalories > 0 && (
                  <span className="text-xs rounded-md px-2 py-1 font-medium bg-surface text-warning border border-warning-soft">酒精 {computed.alcoholCalories}kcal</span>
                )}
              </div>

              <span className="shrink-0 text-lg font-bold text-text-strong">
                {computed.calories}<span className="text-xs font-normal text-text-subtle ml-1">kcal</span>
              </span>
            </div>
          </section>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 text-sm rounded-lg px-4 py-2.5 border border-border text-text-muted hover:bg-background"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 text-sm rounded-lg px-4 py-2.5 bg-invert-bg text-white hover:bg-invert-bg disabled:opacity-50"
            >
              {submitting ? '儲存中...' : isEditing ? '儲存變更' : '新增紀錄'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}