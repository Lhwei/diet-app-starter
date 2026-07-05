'use client'

export interface TimeRangeOption {
  label: string
  days: number
}

export const timeRangeOptions: TimeRangeOption[] = [
  { label: '近7天', days: 7 },
  { label: '近30天', days: 30 },
  { label: '近90天', days: 90 },
  { label: '近180天', days: 180 },
  { label: '近一年', days: 365 },
]

interface Props {
  value: number
  onChange: (days: number) => void
}

export default function TimeRangeTabs({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1 text-sm">
      {timeRangeOptions.map((opt) => (
        <button
          key={opt.days}
          onClick={() => onChange(opt.days)}
          className={`px-3 py-1.5 rounded-lg transition ${
            value === opt.days ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
