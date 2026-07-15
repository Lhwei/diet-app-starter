'use client'

import { useTheme } from '@/lib/theme/ThemeContext'
import { THEME_IDS, THEMES } from '@/lib/theme/themes'

export default function ThemeSettingsPage() {
  const { themeId, setThemeId, isSyncing } = useTheme()

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <h1 className="text-text-strong text-xl font-semibold mb-1">主題設定</h1>
      <p className="text-text-muted text-sm mb-6">
        選一個現在的心情 {isSyncing && '（同步中…）'}
      </p>

      <div className="grid grid-cols-1 gap-4">
        {THEME_IDS.map((id) => {
          const theme = THEMES[id]
          const selected = id === themeId
          return (
            <button
              key={id}
              onClick={() => setThemeId(id)}
              className={`rounded-xl border-2 p-4 text-left transition-colors bg-surface ${
                selected ? 'border-accent' : 'border-border-light'
              }`}
            >
              <div className="text-text-strong font-medium">{theme.label}</div>
              {selected && (
                <div className="text-accent text-xs mt-1">目前使用中</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}