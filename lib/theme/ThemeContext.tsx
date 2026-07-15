'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { DEFAULT_THEME, ThemeId, isThemeId } from './themes'

const STORAGE_KEY = 'diet-app-theme'

interface ThemeContextValue {
  themeId: ThemeId
  setThemeId: (id: ThemeId) => void
  isSyncing: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyThemeToDocument(themeId: ThemeId) {
  document.documentElement.setAttribute('data-theme', themeId)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME
    const cached = window.localStorage.getItem(STORAGE_KEY)
    return cached && isThemeId(cached) ? cached : DEFAULT_THEME
  })
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    applyThemeToDocument(themeId)
  }, [themeId])

  useEffect(() => {
    let cancelled = false
    setIsSyncing(true)
    fetch('/api/theme')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.themeId || !isThemeId(data.themeId)) return
        setThemeIdState(data.themeId)
        window.localStorage.setItem(STORAGE_KEY, data.themeId)
      })
      .catch(() => {
        // 離線或未登入：靜默失敗，維持本機快取值
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id)
    window.localStorage.setItem(STORAGE_KEY, id)
    applyThemeToDocument(id)

    fetch('/api/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId: id }),
    }).catch(() => {
      // 同步失敗不 rollback UI，下次背景同步時再對齊
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, isSyncing }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme 必須在 ThemeProvider 內使用')
  return ctx
}