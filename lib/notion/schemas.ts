// Notion Database Property Schema 定義
// 根據隊長提供的欄位設計文件轉換而成，用於呼叫 Notion API 建立資料庫時的 properties 參數
// 個人資料已改為 Database（原規格是 Page，因欄位含 Select/Multi-select/Number，改用 Database 較合理）

type NotionPropertySchema = Record<string, any>

// ---------- 個人資料 資料庫 schema ----------
export const personalProfileSchema: NotionPropertySchema = {
  '暱稱': { title: {} }, // Notion 資料庫必須有一個 title 屬性作為主鍵
  'user_id': { rich_text: {} },
  '性別': { select: { options: [{ name: '女' }, { name: '男' }, { name: '其他' }] } },
  '出生日期': { date: {} },
  '身高(cm)': { number: { format: 'number' } },
  '起始體重(kg)': { number: { format: 'number' } },
  '目標體重(kg)': { number: { format: 'number' } },
  '目標達成日期': { date: {} },
  '日常活動係數': {
    select: {
      options: [
        { name: '久坐1.2' }, { name: '輕度1.375' }, { name: '中度1.55' },
        { name: '高度1.725' }, { name: '非常高1.9' },
      ],
    },
  },
  '每日熱量目標(kcal)': { number: { format: 'number' } },
  '三大營養素目標比例': { rich_text: {} }, // 例如 "20/30/50"
  '目標模式': {
    select: { options: [{ name: '減脂控卡' }, { name: '日常維持' }, { name: '血糖控制' }] },
  },
  '飲食模式': {
    select: {
      options: [
        { name: '一般均衡' }, { name: '211餐盤' }, { name: '低醣' }, { name: '間歇性斷食' },
      ],
    },
  },
  '進食時間窗口': { rich_text: {} },
  '食物過敏原': {
    multi_select: {
      options: [
        { name: '麩質' }, { name: '甲殼類' }, { name: '蛋' }, { name: '魚' },
        { name: '花生' }, { name: '大豆' }, { name: '奶' }, { name: '堅果' },
        { name: '芹菜' }, { name: '芝麻' }, { name: '亞硫酸鹽' },
      ],
    },
  },
  '不耐/敏感食物': { rich_text: {} },
  '飲食禁忌/宗教限制': {
    multi_select: { options: [{ name: '素食' }, { name: '不吃牛' }, { name: '無' }] },
  },
  '家族病史': { rich_text: {} }, // 改為自由文字填寫（原multi_select選項不夠彈性，例如需標註「父親/母親」等關係）
  '目前診斷慢性病': {
    multi_select: {
      options: [
        { name: '無' }, { name: '糖尿病前期' }, { name: '高血壓' }, { name: '胰島素阻抗' }, { name: '其他' },
      ],
    },
  },
  '用藥/保健品': { rich_text: {} },
  '每日飲水目標(ml)': { number: { format: 'number' } },
  '睡眠目標時數': { number: { format: 'number' } },
  '慣用量測方式': {
    select: {
      options: [
        { name: '手掌估算' }, { name: '容器估算' }, { name: '實體秤重' }, { name: '包裝標示' },
      ],
    },
  },
  'BMR快照(kcal)': { number: { format: 'number' } },
  'TDEE快照(kcal)': { number: { format: 'number' } },
  'BMI快照': { number: { format: 'number' } },
  'Notion授權狀態': { checkbox: {} },
  '最後更新日期': { last_edited_time: {} },
}

// ---------- 生理紀錄 資料庫 schema ----------
export const physioRecordSchema: NotionPropertySchema = {
  '記錄日期': { title: {} },
  'user_id': { rich_text: {} },
  '時段標記': {
    select: { options: [{ name: '晨起' }, { name: '餐前' }, { name: '餐後' }, { name: '睡前' }, { name: '其他' }] },
  },
  '體重(kg)': { number: { format: 'number' } },
  '體脂率(%)': { number: { format: 'number' } },
  '腰圍(cm)': { number: { format: 'number' } },
  '臀圍(cm)': { number: { format: 'number' } },
  '收縮壓(mmHg)': { number: { format: 'number' } },
  '舒張壓(mmHg)': { number: { format: 'number' } },
  '心跳(bpm)': { number: { format: 'number' } },
  '血糖值(mg/dL)': { number: { format: 'number' } },
  '血糖量測時點': {
    select: { options: [{ name: '空腹' }, { name: '餐前' }, { name: '餐後1hr' }, { name: '餐後2hr' }] },
  },
  '總膽固醇TC(mg/dL)': { number: { format: 'number' } },
  '低密度LDL(mg/dL)': { number: { format: 'number' } },
  '高密度HDL(mg/dL)': { number: { format: 'number' } },
  '三酸甘油酯TG(mg/dL)': { number: { format: 'number' } },
  '糖化血色素HbA1c(%)': { number: { format: 'number' } },
  '空腹胰島素/HOMA-IR': { number: { format: 'number' } },
  '骨密度T值': { number: { format: 'number' } },
  '骨骼肌量(kg)': { number: { format: 'number' } },
  '握力(kg)': { number: { format: 'number' } },
  '肌酸酐/eGFR': { number: { format: 'number' } },
  'GOT/GPT': { number: { format: 'number' } },
  '飲水量(ml)': { number: { format: 'number' } },
  '睡眠時數(hr)': { number: { format: 'number' } },
  '睡眠品質': {
    select: { options: [{ name: '很差' }, { name: '普通' }, { name: '良好' }, { name: '極佳' }] },
  },
  '運動類型': { multi_select: { options: [{ name: '爬樓梯' }, { name: '走路' }, { name: '其他' }] } },
  '運動時長(分)': { number: { format: 'number' } },
  '經期/生理狀態': {
    select: { options: [{ name: '經期中' }, { name: '黃體期' }, { name: '濾泡期' }, { name: '無' }] },
  },
}

// ---------- 飲食紀錄 資料庫 schema ----------
// 註：「照片」欄位（Files & media）第一版先跳過，之後需要 Notion 檔案上傳流程支援後再加
export const dietRecordSchema: NotionPropertySchema = {
  '記錄時間': { title: {} },
  'user_id': { rich_text: {} },
  '餐別': {
    select: { options: [{ name: '早餐' }, { name: '午餐' }, { name: '晚餐' }, { name: '點心' }, { name: '宵夜' }] },
  },
  '進食時段標記': { select: { options: [{ name: '早餐前' }, { name: '早餐後' }] } },
  '全穀雜糧類(份)': { number: { format: 'number' } },
  '豆魚蛋肉類(份)': { number: { format: 'number' } },
  '蔬菜類(份)': { number: { format: 'number' } },
  '水果類(份)': { number: { format: 'number' } },
  '乳品類(份)': { number: { format: 'number' } },
  '油脂與堅果種子類(份)': { number: { format: 'number' } },
  '蛋白質(g)': { number: { format: 'number' } },
  '脂質(g)': { number: { format: 'number' } },
  '碳水化合物(g)': { number: { format: 'number' } },
  '三大營養素比例(%)': { rich_text: {} }, // 前端算完寫入
  '總熱量(kcal)': { number: { format: 'number' } },
  '膳食纖維(g)': { number: { format: 'number' } },
  '鈉(mg)': { number: { format: 'number' } },
  '與熱量目標差距': { number: { format: 'number' } }, // 前端算完寫入
  '餐前/餐後血糖(mg/dL)': { number: { format: 'number' } },
  '進食順序': {
    select: { options: [{ name: '水→蛋白質/蔬菜→澱粉→水果' }, { name: '其他' }] },
  },
  '飽足感': {
    select: { options: [{ name: '空空如也' }, { name: '微飽輕食' }, { name: '適中飽腹' }, { name: '極度飽腹' }] },
  },
  '油脂感知': { select: { options: [{ name: '清爽' }, { name: '普通' }, { name: '偏油膩' }] } },
  '精神/睏意': { select: { options: [{ name: '清醒' }, { name: '普通' }, { name: '昏沉' }] } },
  '身體不適標記': {
    multi_select: { options: [{ name: '蕁麻疹' }, { name: '脹氣' }, { name: '心悸' }, { name: '無異常' }] },
  },
  '目標模式': {
    select: { options: [{ name: '減脂控卡' }, { name: '日常維持' }, { name: '血糖控制' }] },
  },
  '量測方式': {
    select: {
      options: [
        { name: '手掌估算' }, { name: '容器估算' }, { name: '實體個數' }, { name: '包裝標示' },
      ],
    },
  },
  '食物內容': { rich_text: {} },
  '場景/來源': {
    select: { options: [{ name: '自煮' }, { name: '超商' }, { name: '外食餐廳' }, { name: '朋友聚餐' }] },
  },
  '備註': { rich_text: {} },
}
