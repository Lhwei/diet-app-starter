'use client'

// App式週曆header：顯示「年月」在最上方(點擊可選年份/月份)，
// 下方是一週7天(週一到週日)的日期格，可左右切換上下週，點選某天即切換選中日期

import { useState } from 'react'
import { getWeekStart, getWeekDates, addWeeks, isSameDay, formatYearMonth, WEEKDAY_LABELS } from '@/lib/date/weekUtils'

interface WeekCalendarHeaderProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export default function WeekCalendarHeader({ selectedDate, onSelectDate }: WeekCalendarHeaderProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(selectedDate))
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false)

  const weekDates = getWeekDates(weekStart)
  const today = new Date()

  function goToPreviousWeek() {
    setWeekStart((prev) => addWeeks(prev, -1))
  }

  function goToNextWeek() {
    setWeekStart((prev) => addWeeks(prev, 1))
  }

  function handleSelectDay(d: Date) {
    onSelectDate(d)
  }

  // 年月選擇：簡單的年份+月份下拉，選擇後跳到該月第一天所在週
  const currentYear = weekStart.getFullYear()
  const currentMonth = weekStart.getMonth()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i)

  function handleYearMonthChange(year: number, month: number) {
    const newDate = new Date(year, month, 1)
    setWeekStart(getWeekStart(newDate))
    setShowYearMonthPicker(false)
  }

  return (
    <div className="space-y-3">
      <div className="relative flex items-center justify-center">
        <button
          onClick={() => setShowYearMonthPicker((v) => !v)}
          className="text-sm font-semibold text-gray-700 flex items-center gap-1 hover:text-black"
        >
          {formatYearMonth(weekStart)}
          <span className="text-xs text-gray-400">▾</span>
        </button>

        {showYearMonthPicker && (
          <div className="absolute top-8 z-10 bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex gap-2">
            <select
              value={currentYear}
              onChange={(e) => handleYearMonthChange(Number(e.target.value), currentMonth)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              value={currentMonth}
              onChange={(e) => handleYearMonthChange(currentYear, Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            >
              {Array.from({ length: 12 }, (_, m) => (
                <option key={m} value={m}>{m + 1}月</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={goToPreviousWeek}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          aria-label="上一週"
        >
          ‹
        </button>

        <div className="flex-1 grid grid-cols-7 gap-1">
          {weekDates.map((d, i) => {
            const selected = isSameDay(d, selectedDate)
            const isToday = isSameDay(d, today)
            return (
              <button
                key={d.toISOString()}
                onClick={() => handleSelectDay(d)}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 transition ${
                  selected
                    ? 'bg-black text-white'
                    : isToday
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-[10px] opacity-70">{WEEKDAY_LABELS[i]}</span>
                <span className="text-sm font-semibold">{d.getDate()}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={goToNextWeek}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          aria-label="下一週"
        >
          ›
        </button>
      </div>
    </div>
  )
}
