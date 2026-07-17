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

// ============================================================================
// 時區安全的「單日邊界」換算（本次新增）
// ============================================================================
//
// 為什麼需要這個：
// /api/diet?date=YYYY-MM-DD、/api/physio?date=YYYY-MM-DD 這類單日查詢，
// 過去後端是直接用 new Date(`${dateParam}T00:00:00`) 組出當天起訖時間，
// 這個寫法在「不帶時區資訊的字串」情況下，JS會用「執行環境當下的時區」
// 去解析它——在本機開發（台灣時區）解析成台灣時間沒有問題，
// 但部署到Vercel後，伺服器容器預設是UTC，同一段程式碼解析出來的
// 起訖時間點整整偏移了使用者的時區offset（例如台灣是+8小時），
// 導致「跨日但使用者裝置尚未跨日」或「使用者裝置已跨日但伺服器判斷還沒」
// 的邊界資料被分到錯誤的一天。
//
// 也不能直接寫死 `+08:00` 之類的固定offset字串，因為：
// 1. 使用者可能不在台灣時區（出國/未來多時區使用者）
// 2. 部分時區有夏令時，同一時區在不同季節offset不同
//
// 正確作法：時區資訊必須由「使用者瀏覽器端」偵測（getUserTimeZone()），
// 當作參數往下傳到API層，再用下面這組函式動態換算成正確的UTC時間點，
// 不在任何地方假設固定offset。
//
// 演算法：
// 1. 把「目標時區的年月日時分秒」先當成UTC組出一個「假設時間點」
// 2. 用Intl.DateTimeFormat反查這個「假設時間點」在目標時區實際顯示的時間
// 3. 兩者的差距，就是該時間點在該時區的真實offset（已包含夏令時修正）
// 4. 用這個offset修正一次「假設時間點」，得到真正對應的UTC時間
// 這是 date-fns-tz 的 zonedTimeToUtc 採用的同一套思路，
// 精度足以應付「日界線」這種以分鐘為單位就會出錯的場景。

function getTimeZoneOffsetMs(utcDate: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(utcDate)
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)

  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )
  return asUTC - utcDate.getTime()
}

function zonedTimeToUtc(dateKey: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  const [h, mi, s, ms = 0] = timeStr.split(/[:.]/).map(Number)
  const naiveUTC = new Date(Date.UTC(y, m - 1, d, h, mi, s, ms))
  const offsetMs = getTimeZoneOffsetMs(naiveUTC, timeZone)
  return new Date(naiveUTC.getTime() - offsetMs)
}

// 供 API route 使用：算出「指定IANA時區」下，某一天（YYYY-MM-DD）
// 從00:00:00.000到23:59:59.999對應的正確UTC時間點。
// timeZone 一律由前端偵測後透過query參數傳入（見 lib/hooks/useNotionData.ts），
// 若沒有帶，呼叫端應自行決定fallback（建議是'UTC'，不要在這裡偷偷假設任何時區）。
export function getDayBoundsInTimeZone(
  dateKey: string,
  timeZone: string
): { dayStart: Date; dayEnd: Date } {
  return {
    dayStart: zonedTimeToUtc(dateKey, '00:00:00.000', timeZone),
    dayEnd: zonedTimeToUtc(dateKey, '23:59:59.999', timeZone),
  }
}
