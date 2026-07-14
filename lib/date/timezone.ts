// 統一時區處理工具：所有跨日彙整/分桶邏輯都應該透過這裡取得日期key，
// 避免各檔案各自用UTC或本地時間各寫一套，導致互相對不上
// （教訓來自 aggregateDiet.ts 與 aggregatePhysio.ts 過去各自用 toISOString().slice(0,10) 取UTC日期）

// 偵測執行環境（瀏覽器/伺服器）目前的時區設定；若偵測失敗才退回UTC，避免整支程式crash。
// 注意：若這段邏輯是在伺服器端執行（如Next.js Server Component/API Route），
// 偵測到的會是伺服器的時區，不是使用者瀏覽器的時區。若部署環境（如Vercel）跑在UTC，
// 建議改為由前端偵測後把timeZone字串當參數傳入，而非只依賴這裡的自動偵測。
export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// 將任意時間點（ISO字串或Date物件），依指定時區轉換成YYYY-MM-DD字串。
// 這裡只是「顯示/分桶用」的衍生值計算，不會改動任何原始時間戳資料本身。
export function toDateKey(input: string | Date, timeZone: string = getUserTimeZone()): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)

  const y = parts.find((p) => p.type === 'year')!.value
  const m = parts.find((p) => p.type === 'month')!.value
  const day = parts.find((p) => p.type === 'day')!.value
  return `${y}-${m}-${day}`
}

// 將YYYY-MM-DD的日期key轉成MM/dd的顯示用label
export function toLabel(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  return `${m}/${d}`
}

// 產生從"今天"（依指定時區判斷）往前推days天的日期key陣列，由舊到新排序。
// 供bucketByDay/bucketHealthBehaviorByDay這類函式建立完整、連續的日期範圍用，
// 即使某天沒紀錄也會補0，避免圖表X軸缺漏日期。
export function getDayKeyRange(days: number, timeZone: string = getUserTimeZone()): string[] {
  const todayKey = toDateKey(new Date(), timeZone)
  const [ty, tm, td] = todayKey.split('-').map(Number)
  // 先用「該時區下的今天」算出對應的年月日數字，再用Date.UTC建構一個穩定的午夜時間點做基準，
  // 之後全部用setUTCDate遞減，避免受執行環境本身的UTC偏移干擾天數計算
  const baseUTC = new Date(Date.UTC(ty, tm - 1, td))

  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(baseUTC)
    d.setUTCDate(d.getUTCDate() - i)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    keys.push(key)
  }
  return keys
}