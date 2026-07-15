export const THEME_IDS = ['minimal', 'cute', 'cool'] as const
export type ThemeId = (typeof THEME_IDS)[number]
export const DEFAULT_THEME: ThemeId = 'minimal'

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value)
}

// 27 個固定插槽：15 個基礎色 + 12 個語意色。
// 新增主題時 TypeScript 會強制檢查有沒有填齊。
export interface ThemeColors {
  // 基礎色
  textStrong: string
  textBody: string
  textMuted: string
  textSubtle: string
  textDisabled: string
  bg: string
  surface: string
  surfaceMuted: string
  invertBg: string
  border: string
  borderLight: string
  borderSubtle: string
  accent: string
  accentHover: string
  accentSoft: string

  // 語意色：danger（錯誤/超標/刪除）
  danger: string
  dangerHover: string
  dangerSoft: string

  // 語意色：success（成功/達標）
  success: string
  successHover: string
  successSoft: string

  // 語意色：warning（警告/提醒，統一收斂原本的 amber + yellow + orange）
  warning: string
  warningHover: string
  warningSoft: string

  // 語意色：info（資訊提示，原本的 sky）
  info: string
  infoHover: string
  infoSoft: string
}

interface ThemeConfig {
  id: ThemeId
  label: string
  /** public/images/theme/(id) 底下的資料夾 */
  assetsPath: string
  colors: ThemeColors
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  minimal: {
    id: 'minimal',
    label: '簡約',
    assetsPath: '/images/theme/minimal',
    colors: {
      textStrong: '#111827',
      textBody: '#374151',
      textMuted: '#6b7280',
      textSubtle: '#9ca3af',
      textDisabled: '#d1d5db',
      bg: '#f9fafb',
      surface: '#ffffff',
      surfaceMuted: '#f3f4f6',
      invertBg: '#111827',
      border: '#d1d5db',
      borderLight: '#e5e7eb',
      borderSubtle: '#f3f4f6',
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      accentSoft: '#eff6ff',

      danger: '#dc2626',
      dangerHover: '#b91c1c',
      dangerSoft: '#fef2f2',

      success: '#16a34a',
      successHover: '#15803d',
      successSoft: '#f0fdf4',

      warning: '#ea580c',
      warningHover: '#c2410c',
      warningSoft: '#fff7ed',

      info: '#0284c7',
      infoHover: '#0369a1',
      infoSoft: '#f0f9ff',
    },
  },
  cute: {
    id: 'cute',
    label: '可愛',
    assetsPath: '/images/theme/cute',
    colors: {
      textStrong: '#4a2540',
      textBody: '#7a4a68',
      textMuted: '#a8748f',
      textSubtle: '#d4a5bc',
      textDisabled: '#f0d5e2',
      bg: '#fff1f5',
      surface: '#ffffff',
      surfaceMuted: '#ffe4ec',
      invertBg: '#f472b6',
      border: '#fbcfe8',
      borderLight: '#fce7f3',
      borderSubtle: '#fdf2f8',
      accent: '#f472b6',
      accentHover: '#ec4899',
      accentSoft: '#fce7f3',

      danger: '#f43f5e',
      dangerHover: '#e11d48',
      dangerSoft: '#fff1f2',

      success: '#4ade80',
      successHover: '#22c55e',
      successSoft: '#f0fdf4',

      warning: '#fb923c',
      warningHover: '#f97316',
      warningSoft: '#fff7ed',

      info: '#38bdf8',
      infoHover: '#0ea5e9',
      infoSoft: '#f0f9ff',
    },
  },
  cool: {
    id: 'cool',
    label: '帥氣',
    assetsPath: '/images/theme/cool',
    colors: {
      textStrong: '#f1f5f9',
      textBody: '#cbd5e1',
      textMuted: '#94a3b8',
      textSubtle: '#64748b',
      textDisabled: '#475569',
      bg: '#0f172a',
      surface: '#1e293b',
      surfaceMuted: '#334155',
      invertBg: '#36506a',
      border: '#334155',
      borderLight: '#1e293b',
      borderSubtle: '#0f172a',
      accent: '#22d3ee',
      accentHover: '#06b6d4',
      accentSoft: '#164e63',

      danger: '#f87171',
      dangerHover: '#ef4444',
      dangerSoft: '#7f1d1d',

      success: '#4ade80',
      successHover: '#22c55e',
      successSoft: '#14532d',

      warning: '#fb923c',
      warningHover: '#f97316',
      warningSoft: '#7c2d12',

      info: '#7dd3fc',
      infoHover: '#38bdf8',
      infoSoft: '#0c4a6e',
    },
  },
}

/** 固定插槽名稱：每個主題資料夾底下都要有同名檔案 */
export const THEME_ASSET_SLOTS = {
  bgHome: 'bg-home.png',
  bgDashboard: 'bg-dashboard.png',
  iconMeal: 'icon-meal.svg',
  iconWater: 'icon-water.svg',
} as const

export function getThemeAssetUrl(
  themeId: ThemeId,
  slot: keyof typeof THEME_ASSET_SLOTS
) {
  return `${THEMES[themeId].assetsPath}/${THEME_ASSET_SLOTS[slot]}`
}

// camelCase key -> CSS 變數名稱，跟 tailwind.config.ts 的 var() 對應
const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  textStrong: '--color-text-strong',
  textBody: '--color-text-body',
  textMuted: '--color-text-muted',
  textSubtle: '--color-text-subtle',
  textDisabled: '--color-text-disabled',
  bg: '--color-bg',
  surface: '--color-surface',
  surfaceMuted: '--color-surface-muted',
  invertBg: '--color-invert-bg',
  border: '--color-border',
  borderLight: '--color-border-light',
  borderSubtle: '--color-border-subtle',
  accent: '--color-accent',
  accentHover: '--color-accent-hover',
  accentSoft: '--color-accent-soft',

  danger: '--color-danger',
  dangerHover: '--color-danger-hover',
  dangerSoft: '--color-danger-soft',

  success: '--color-success',
  successHover: '--color-success-hover',
  successSoft: '--color-success-soft',

  warning: '--color-warning',
  warningHover: '--color-warning-hover',
  warningSoft: '--color-warning-soft',

  info: '--color-info',
  infoHover: '--color-info-hover',
  infoSoft: '--color-info-soft',
}

/** 從 THEMES 產生所有 [data-theme='xxx'] CSS 區塊，供 layout.tsx 動態注入 <style> */
export function generateThemeCss(): string {
  return THEME_IDS.map((id) => {
    const colors = THEMES[id].colors
    const vars = (Object.keys(colors) as (keyof ThemeColors)[])
      .map((key) => `  ${CSS_VAR_MAP[key]}: ${colors[key]};`)
      .join('\n')
    return `[data-theme='${id}'] {\n${vars}\n}`
  }).join('\n\n')
}