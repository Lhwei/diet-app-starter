// 生理紀錄表單欄位設定：驅動表單 UI 與 Notion property 讀寫的單一設定來源

export type PhysioFieldType = 'title' | 'select' | 'multi_select' | 'number' | 'rich_text'

export interface PhysioFieldConfig {
  key: string
  notionProp: string
  label: string
  type: PhysioFieldType
  options?: string[]
  required?: boolean
  group: string // 用於表單分區顯示
}

export const physioFields: PhysioFieldConfig[] = [
  { key: 'timeSlot', notionProp: '時段標記', label: '時段標記', type: 'select', options: ['晨起', '餐前', '餐後', '睡前', '其他'], group: '時段' },

  { key: 'weight', notionProp: '體重(kg)', label: '體重(kg)', type: 'number', group: '體位' },
  { key: 'bodyFat', notionProp: '體脂率(%)', label: '體脂率(%)', type: 'number', group: '體位' },
  { key: 'waist', notionProp: '腰圍(cm)', label: '腰圍(cm)', type: 'number', group: '體位' },
  { key: 'hip', notionProp: '臀圍(cm)', label: '臀圍(cm)', type: 'number', group: '體位' },

  { key: 'systolic', notionProp: '收縮壓(mmHg)', label: '收縮壓(mmHg)', type: 'number', group: '心血管' },
  { key: 'diastolic', notionProp: '舒張壓(mmHg)', label: '舒張壓(mmHg)', type: 'number', group: '心血管' },
  { key: 'heartRate', notionProp: '心跳(bpm)', label: '心跳(bpm)', type: 'number', group: '心血管' },

  { key: 'bloodSugar', notionProp: '血糖值(mg/dL)', label: '血糖值(mg/dL)', type: 'number', group: '血糖代謝' },
  { key: 'bloodSugarTiming', notionProp: '血糖量測時點', label: '血糖量測時點', type: 'select', options: ['空腹', '餐前', '餐後1hr', '餐後2hr'], group: '血糖代謝' },

  { key: 'totalCholesterol', notionProp: '總膽固醇TC(mg/dL)', label: '總膽固醇TC(mg/dL)', type: 'number', group: '血脂' },
  { key: 'ldl', notionProp: '低密度LDL(mg/dL)', label: '低密度LDL(mg/dL)', type: 'number', group: '血脂' },
  { key: 'hdl', notionProp: '高密度HDL(mg/dL)', label: '高密度HDL(mg/dL)', type: 'number', group: '血脂' },
  { key: 'triglyceride', notionProp: '三酸甘油酯TG(mg/dL)', label: '三酸甘油酯TG(mg/dL)', type: 'number', group: '血脂' },

  { key: 'hba1c', notionProp: '糖化血色素HbA1c(%)', label: '糖化血色素HbA1c(%)', type: 'number', group: '糖化' },
  { key: 'homaIr', notionProp: '空腹胰島素/HOMA-IR', label: '空腹胰島素/HOMA-IR', type: 'number', group: '糖化' },

  { key: 'boneDensity', notionProp: '骨密度T值', label: '骨密度T值', type: 'number', group: '骨骼肌力' },
  { key: 'muscleMass', notionProp: '骨骼肌量(kg)', label: '骨骼肌量(kg)', type: 'number', group: '骨骼肌力' },
  { key: 'gripStrength', notionProp: '握力(kg)', label: '握力(kg)', type: 'number', group: '骨骼肌力' },

  { key: 'creatinine', notionProp: '肌酸酐/eGFR', label: '肌酸酐/eGFR', type: 'number', group: '腎肝功能' },
  { key: 'gotGpt', notionProp: 'GOT/GPT', label: 'GOT/GPT', type: 'number', group: '腎肝功能' },

  { key: 'waterIntake', notionProp: '飲水量(ml)', label: '飲水量(ml)', type: 'number', group: '生活習慣' },
  { key: 'sleepHours', notionProp: '睡眠時數(hr)', label: '睡眠時數(hr)', type: 'number', group: '生活習慣' },
  { key: 'sleepQuality', notionProp: '睡眠品質', label: '睡眠品質', type: 'select', options: ['很差', '普通', '良好', '極佳'], group: '生活習慣' },
  { key: 'exerciseType', notionProp: '運動類型', label: '運動類型', type: 'multi_select', options: ['爬樓梯', '走路', '其他'], group: '生活習慣' },
  { key: 'exerciseDuration', notionProp: '運動時長(分)', label: '運動時長(分)', type: 'number', group: '生活習慣' },
  { key: 'menstrualStatus', notionProp: '經期/生理狀態', label: '經期/生理狀態', type: 'select', options: ['經期中', '黃體期', '濾泡期', '無'], group: '生活習慣' },
]

export const physioFieldGroups = Array.from(new Set(physioFields.map((f) => f.group)))
