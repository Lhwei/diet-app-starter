// 個人資料表單欄位設定：驅動表單 UI 與 Notion property 讀寫的單一設定來源

export type ProfileFieldType = 'title' | 'select' | 'multi_select' | 'number' | 'rich_text' | 'date' | 'checkbox'

export interface ProfileFieldConfig {
  key: string
  notionProp: string
  label: string
  type: ProfileFieldType
  options?: string[]
  required?: boolean
  group: string
  readOnly?: boolean // 由前端自動計算寫入，使用者無法手動編輯
  autoSuggested?: boolean // 自動計算出建議值並預填，但使用者仍可手動覆寫
  helperText?: string
}

export const profileFields: ProfileFieldConfig[] = [
  { key: 'nickname', notionProp: '暱稱', label: '暱稱', type: 'title', required: true, group: '基本資料' },
  { key: 'gender', notionProp: '性別', label: '性別', type: 'select', options: ['女', '男', '其他'], required: true, group: '基本資料' },
  { key: 'birthDate', notionProp: '出生日期', label: '出生日期', type: 'date', required: true, group: '基本資料' },
  { key: 'heightCm', notionProp: '身高(cm)', label: '身高(cm)', type: 'number', required: true, group: '基本資料' },

  { key: 'startWeight', notionProp: '起始體重(kg)', label: '起始體重(kg)', type: 'number', required: true, group: '體重與目標' },
  { key: 'targetWeight', notionProp: '目標體重(kg)', label: '目標體重(kg)', type: 'number', group: '體重與目標' },
  { key: 'targetDate', notionProp: '目標達成日期', label: '目標達成日期', type: 'date', group: '體重與目標' },
  { key: 'activityFactor', notionProp: '日常活動係數', label: '日常活動係數', type: 'select', options: ['久坐1.2', '輕度1.375', '中度1.55', '高度1.725', '非常高1.9'], required: true, group: '體重與目標' },
  // 目標模式排在熱量目標之前：因為熱量目標是依「目標模式」自動計算出的建議值，
  // 因果順序上使用者要先看到/選擇目標模式，才會理解下方熱量數字從何而來
  { key: 'targetMode', notionProp: '目標模式', label: '目標模式', type: 'select', options: ['減脂控卡', '日常維持', '血糖控制'], group: '體重與目標' },
  { key: 'calorieTarget', notionProp: '每日熱量目標(kcal)', label: '每日熱量目標(kcal)', type: 'number', group: '體重與目標', autoSuggested: true, helperText: '依TDEE與目標模式自動計算建議值，可手動調整覆寫' },
  // 飲食模式排在三大營養素比例之前：同樣道理，比例滑桿的建議值是依「飲食模式」帶入的
  { key: 'dietMode', notionProp: '飲食模式', label: '飲食模式', type: 'select', options: ['一般均衡', '211餐盤', '低醣', '間歇性斷食'], group: '體重與目標' },
  // 三大營養素目標比例：型別仍是rich_text（因為Notion端存文字），但表單UI改用MacroRatioSlider視覺化調整（見ProfileForm.tsx），
  // 拖動滑桿時即時換算成 "20/30/50" 格式的文字寫進這個欄位，儲存邏輯完全不用改動
  { key: 'macroRatioTarget', notionProp: '三大營養素目標比例', label: '三大營養素目標比例', type: 'rich_text', group: '體重與目標', helperText: '拖動下方滑桿調整，會依飲食模式自動帶入建議比例' },
  { key: 'eatingWindow', notionProp: '進食時間窗口', label: '進食時間窗口', type: 'rich_text', group: '體重與目標', helperText: '例如 08:00-18:00' },

  { key: 'foodAllergies', notionProp: '食物過敏原', label: '食物過敏原', type: 'multi_select', options: ['麩質', '甲殼類', '蛋', '魚', '花生', '大豆', '奶', '堅果', '芹菜', '芝麻', '亞硫酸鹽'], group: '過敏與疾病史' },
  { key: 'intolerantFoods', notionProp: '不耐/敏感食物', label: '不耐/敏感食物', type: 'rich_text', group: '過敏與疾病史' },
  { key: 'dietaryRestrictions', notionProp: '飲食禁忌/宗教限制', label: '飲食禁忌/宗教限制', type: 'rich_text', group: '過敏與疾病史', helperText: '自由文字填寫，例如：素食、不吃牛、不吃豬肉、五辛素等' },
  { key: 'familyHistory', notionProp: '家族病史', label: '家族病史', type: 'rich_text', group: '過敏與疾病史', helperText: '自由文字填寫，例如：父親高血壓、母親糖尿病' },
  { key: 'currentConditions', notionProp: '目前診斷慢性病', label: '目前診斷慢性病', type: 'rich_text', group: '過敏與疾病史', helperText: '自由文字填寫，例如：糖尿病前期、高血壓、胰島素阻抗等' },
  { key: 'medications', notionProp: '用藥/保健品', label: '用藥/保健品', type: 'rich_text', group: '過敏與疾病史' },

  { key: 'waterTarget', notionProp: '每日飲水目標(ml)', label: '每日飲水目標(ml)', type: 'number', group: '生活習慣目標', readOnly: true, helperText: '固定計算：體重(kg)×30 ~ 體重(kg)×40，取中位數' },
  { key: 'sleepTarget', notionProp: '睡眠目標時數', label: '睡眠目標時數', type: 'number', group: '生活習慣目標' },
  { key: 'measureMethod', notionProp: '慣用量測方式', label: '慣用量測方式', type: 'select', options: ['手掌估算', '容器估算', '實體秤重', '包裝標示'], group: '生活習慣目標' },

  { key: 'bmr', notionProp: 'BMR快照(kcal)', label: '基礎代謝率BMR(kcal)', type: 'number', group: '自動計算快照', readOnly: true },
  { key: 'tdee', notionProp: 'TDEE快照(kcal)', label: '每日總消耗TDEE(kcal)', type: 'number', group: '自動計算快照', readOnly: true },
  { key: 'bmi', notionProp: 'BMI快照', label: 'BMI', type: 'number', group: '自動計算快照', readOnly: true },
]

export const profileFieldGroups = Array.from(new Set(profileFields.map((f) => f.group)))