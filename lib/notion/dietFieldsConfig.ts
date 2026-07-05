// 飲食紀錄表單欄位設定：驅動表單 UI 與 Notion property 讀寫的單一設定來源
// type 對應到 Notion property 型態：title / select / multi_select / number / rich_text

export type DietFieldType = 'title' | 'select' | 'multi_select' | 'number' | 'rich_text'

export interface DietFieldConfig {
  key: string // 前端表單用的 key（英文，方便 React state 操作）
  notionProp: string // 對應 Notion database 的 property 名稱（中文，需與 schemas.ts 完全一致）
  label: string
  type: DietFieldType
  options?: string[] // select / multi_select 專用
  required?: boolean
  readOnly?: boolean // 由前端自動計算寫入，使用者不可手動編輯
}

export const dietFields: DietFieldConfig[] = [
  { key: 'mealType', notionProp: '餐別', label: '餐別', type: 'select', options: ['早餐', '午餐', '晚餐', '點心', '宵夜'], required: true },
  { key: 'foodContent', notionProp: '食物內容', label: '食物內容', type: 'rich_text', required: true },
  { key: 'wholeGrain', notionProp: '全穀雜糧類(份)', label: '全穀雜糧類(份)', type: 'number' },
  { key: 'proteinFood', notionProp: '豆魚蛋肉類(份)', label: '豆魚蛋肉類(份)', type: 'number' },
  { key: 'vegetable', notionProp: '蔬菜類(份)', label: '蔬菜類(份)', type: 'number' },
  { key: 'fruit', notionProp: '水果類(份)', label: '水果類(份)', type: 'number' },
  { key: 'dairy', notionProp: '乳品類(份)', label: '乳品類(份)', type: 'number' },
  { key: 'oilNuts', notionProp: '油脂與堅果種子類(份)', label: '油脂與堅果種子類(份)', type: 'number' },
  { key: 'protein', notionProp: '蛋白質(g)', label: '蛋白質(g)', type: 'number', readOnly: true },
  { key: 'fat', notionProp: '脂質(g)', label: '脂質(g)', type: 'number', readOnly: true },
  { key: 'carb', notionProp: '碳水化合物(g)', label: '碳水化合物(g)', type: 'number', readOnly: true },
  { key: 'calories', notionProp: '總熱量(kcal)', label: '總熱量(kcal)', type: 'number', readOnly: true },
  { key: 'ratioText', notionProp: '三大營養素比例(%)', label: '三大營養素比例（蛋白質/脂質/碳水）', type: 'rich_text', readOnly: true },
  { key: 'fiber', notionProp: '膳食纖維(g)', label: '膳食纖維(g)', type: 'number' },
  { key: 'sodium', notionProp: '鈉(mg)', label: '鈉(mg)', type: 'number' },
  { key: 'bloodSugar', notionProp: '餐前/餐後血糖(mg/dL)', label: '餐前/餐後血糖(mg/dL)', type: 'number' },
  { key: 'fullness', notionProp: '飽足感', label: '飽足感', type: 'select', options: ['空空如也', '微飽輕食', '適中飽腹', '極度飽腹'] },
  { key: 'oiliness', notionProp: '油脂感知', label: '油脂感知', type: 'select', options: ['清爽', '普通', '偏油膩'] },
  { key: 'alertness', notionProp: '精神/睏意', label: '精神/睏意', type: 'select', options: ['清醒', '普通', '昏沉'] },
  { key: 'discomfort', notionProp: '身體不適標記', label: '身體不適標記', type: 'multi_select', options: ['蕁麻疹', '脹氣', '心悸', '無異常'] },
  { key: 'measureMethod', notionProp: '量測方式', label: '量測方式', type: 'select', options: ['手掌估算', '容器估算', '實體個數', '包裝標示'] },
  { key: 'scene', notionProp: '場景/來源', label: '場景/來源', type: 'select', options: ['自煮', '超商', '外食餐廳', '朋友聚餐'] },
  { key: 'note', notionProp: '備註', label: '備註', type: 'rich_text' },
]
