// 三大營養素目標比例：依飲食模式提供預設值，供視覺化調整工具使用
// 資料來源：隊長提供的飲食模式比例對照表（AMDR基準/211餐盤/低醣/168間歇性斷食）

export interface MacroRatio {
  protein: number
  fat: number
  carb: number
}

export const dietModeMacroPresets: Record<string, MacroRatio> = {
  '一般均衡': { protein: 15, fat: 25, carb: 60 },
  '211餐盤': { protein: 20, fat: 25, carb: 55 },
  '低醣': { protein: 30, fat: 35, carb: 35 },
  '間歇性斷食': { protein: 20, fat: 30, carb: 50 }, // 168本身不設定比例，這裡先給一般均衡的相近預設值，使用者可再自行調整
}

export const defaultMacroRatio: MacroRatio = { protein: 20, fat: 30, carb: 50 }

export function getPresetForDietMode(dietMode?: string): MacroRatio {
  if (dietMode && dietModeMacroPresets[dietMode]) return dietModeMacroPresets[dietMode]
  return defaultMacroRatio
}

// "20/30/50" 格式 <-> 物件 互轉
export function parseMacroRatioText(text?: string | null): MacroRatio | null {
  if (!text) return null
  const parts = text.split('/').map((p) => parseInt(p.trim(), 10))
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return null
  return { protein: parts[0], fat: parts[1], carb: parts[2] }
}

export function formatMacroRatioText(ratio: MacroRatio): string {
  return `${ratio.protein}/${ratio.fat}/${ratio.carb}`
}
