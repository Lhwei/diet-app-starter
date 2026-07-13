// ============================================================================
// SWR data hooks — 統一管理所有「讀取」API 的前端快取
// ============================================================================
//
// 為什麼要這樣做：
// 每次切換頁面時，如果直接用 useEffect + fetch，畫面一定會經歷「空白 -> loading -> 資料」
// 這個過程，就算後端Notion查詢再快，使用者還是會感覺到明顯的等待。
//
// SWR的策略：只要瀏覽器裡有上一次抓過的舊資料，就先立刻顯示（不管新舊），
// 同時在背景重新發request確認資料有沒有變，有變才更新畫面。
// 這樣「切換頁面」這個動作在使用者眼中幾乎是瞬間完成的，因為畫面從頭到尾都有內容。
//
// dedupingInterval: 同一個key在這段時間內重複呼叫不會真的重新發request，直接吃記憶體內的結果，
// 這跟後端的Notion查詢快取是兩層完全獨立的快取，可以疊加使用。
//
// ⚠️ 重要規則（請務必遵守，否則快取形同虛設）：
// 1. 任何「讀取」某個 API 的地方，一律呼叫這裡的 hook，不要在元件裡自己寫
//    useState + useEffect + fetch。SWR 的快取是用「API 路徑字串」當 key 存在
//    全域記憶體裡，只要兩個元件呼叫同一個 key，就會自動共用同一份資料、
//    同一次 request，這就是我們要的「像 Nuxt store 一樣共用」的效果。
// 2. 這裡的 hook 只負責「讀取（GET）」。「新增/修改/刪除」的 fetch 呼叫
//    （POST / PUT / DELETE）維持寫在各自的表單/清單元件即可，但是寫入成功
//    之後，一定要呼叫本檔案下方對應的 invalidate 函式（見「快取失效輔助
//    函式」區塊），通知 SWR 哪些資料舊了該重新抓，不然使用者剛存檔，
//    畫面卻還是顯示舊資料。

import useSWR, { SWRConfiguration, mutate as globalMutate } from 'swr'

// ----------------------------------------------------------------------------
// fetcher
// ----------------------------------------------------------------------------
// 後端 API 發生錯誤時，一律回傳 { error: 'xxx_code', message?: '...' } 這種格式
// （見 app/api/**/route.ts），錯誤代碼放在 `error` 欄位，不是 `message`。
// 元件端（DietDashboard.tsx、PhysioDashboard.tsx、ProfilePageContainer.tsx...）
// 也全部都是讀 body.error 來判斷，例如 notion_not_ready、missing_weight_data。
// 這裡優先讀 error.error，讀不到才退回 error.message，最後才是預設值。
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || body.message || 'request_failed')
  }
  return res.json()
}

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: true, // 切回這個瀏覽器分頁時，自動確認資料有沒有更新
  revalidateOnReconnect: true,
  dedupingInterval: 30_000, // 30秒內同一份資料重複請求，直接吃SWR自己的記憶體快取
  keepPreviousData: true, // 換頁時先保留舊資料在畫面上，不要讓畫面瞬間清空
}

// 專給「指定單一日期」的查詢用（useDietRecordsByDate、usePhysioRecordsByDate）。
// keepPreviousData:true 的行為是「key 換了、新資料還沒回來前，先顯示上一個
// key 的資料」，這對 dashboard 的天數區間切換（7/30/90天）很合理，因為那是
// 同一份資料的不同區間；但對「切換日期」不合理——切到 7/12 時如果沿用這個
// 設定，畫面會先短暫顯示 7/13 的資料（上一個 key 的資料），把使用者導向
// 「錯誤的一天」。因此這裡關掉，讓它每次換日期就老實從 undefined 開始，
// 配合下面 records 預設為 null，元件端才能正確顯示 loading，不會誤把別天
// 的紀錄當成這天的。
const dateListConfig: SWRConfiguration = {
  ...defaultConfig,
  keepPreviousData: false,
}

// ----------------------------------------------------------------------------
// useProfile()
// ----------------------------------------------------------------------------
// 對應 API：GET /api/profile
// 使用範例：
//   const { profile, isLoading, error } = useProfile()
//
// 目前已使用的地方：DailyNutritionSummary.tsx、
// ProfileMetricsSummary.tsx
// 建議補上的地方：ProfilePageContainer.tsx（目前是自己 fetch('/api/profile')）
//
// 寫入後怎麼處理：個人資料更新後，呼叫下方的 invalidateProfileCaches()，
// 不要只呼叫這個 hook 自己的 mutate，因為 profile 改變通常也會影響
// profile-target 跟 weight-projection（見下方說明）。
export function useProfile() {
  const { data, error, isLoading } = useSWR('/api/profile', fetcher, defaultConfig)
  return {
    profile: data?.record ?? null,
    isLoading,
    error,
  }
}

// ----------------------------------------------------------------------------
// useDietRecords(days)
// ----------------------------------------------------------------------------
// 對應 API：GET /api/diet?days=N
// ⚠️ 注意：目前整個專案沒有元件呼叫這個，是備用的。如果要顯示「近N天飲食
// 清單」才會需要它；單日檢視請用下面的 useDietRecordsByDate(date)。
//
// 寫入後怎麼處理：新增/刪除飲食紀錄後，呼叫下方的 invalidateDietCaches(date)。
export function useDietRecords(days: number = 30) {
  const { data, error, isLoading } = useSWR(`/api/diet?days=${days}`, fetcher, defaultConfig)
  return {
    records: data?.records ?? [],
    isLoading,
    error,
  }
}

// ----------------------------------------------------------------------------
// useDietRecordsByDate(date)
// ----------------------------------------------------------------------------
// 對應 API：GET /api/diet?date=YYYY-MM-DD
// 用途：App式週曆日檢視，讀取單一日期的飲食紀錄。
//
// ⚠️ records 預設為 null 而不是 []，原因：
// 這個 hook 要能區分「還沒抓到資料（首次載入中）」跟「API 已回應、但這天
// 確實沒有任何紀錄」這兩種不同狀態。如果預設空陣列，切到一個 SWR還沒快取
// 過的新日期時，records 會先變成 []，容易被誤判成「這天沒紀錄」而不是
// 「還在載入」，畫面可能會閃一下「無紀錄」再變成有資料。
// 元件端請這樣判斷首次載入：
//   if (isLoading && records === null) return <LoadingSpinner />
//   const safeRecords = records ?? []
//
// ⚠️ 這裡一定要用 dateListConfig（關閉 keepPreviousData），不能用
// defaultConfig，理由見上方 dateListConfig 的說明：否則切換週曆日期時，
// 畫面會短暫顯示「上一個被看過的日期」的飲食紀錄。
//
// 建議套用的地方：DietRecordList.tsx
//
// 寫入後怎麼處理：新增/編輯/刪除當天紀錄後，呼叫 invalidateDietCaches(date)，
// 這個 date 一定要跟被異動的那筆紀錄的記錄日期一致，才能讓這裡的 key 對上。
export function useDietRecordsByDate(date: string | null) {
  const { data, error, isLoading } = useSWR(
    date ? `/api/diet?date=${date}` : null,
    fetcher,
    dateListConfig
  )
  return {
    records: data?.records ?? null,
    isLoading,
    error,
  }
}

// ----------------------------------------------------------------------------
// usePhysioRecords(days)
// ----------------------------------------------------------------------------
// 對應 API：GET /api/physio?days=N
// 目前已使用的地方：TodayPhysioSummary.tsx
//
// 寫入後怎麼處理：新增/編輯/刪除生理紀錄後，呼叫 invalidatePhysioCaches()。
export function usePhysioRecords(days: number = 30) {
  const { data, error, isLoading } = useSWR(`/api/physio?days=${days}`, fetcher, defaultConfig)
  return {
    records: data?.records ?? [],
    isLoading,
    error,
  }
}

// ----------------------------------------------------------------------------
// usePhysioRecordsByDate(date)
// ----------------------------------------------------------------------------
// 對應 API：GET /api/physio?date=YYYY-MM-DD
// 用途：讀取週曆所選日期的生理紀錄，例如飲水量（給 DailyNutritionSummary
// 的飲水量欄位用）。
//
// ⚠️ 前提：後端 /api/physio 必須支援 ?date= 這個 query param，依 recordDate
// 篩選單日資料。若尚未支援，這個 hook 會拿到錯誤資料，需要先補 API route。
//
// 跟 useDietRecordsByDate 一樣用 dateListConfig、records 預設 null，理由相同：
// 避免切換日期時沿用前一天資料，並區分「載入中」跟「這天沒紀錄」。
//
// 寫入後怎麼處理：新增/編輯/刪除生理紀錄後，呼叫 invalidatePhysioCaches(date)，
// date 帶上被異動那筆紀錄的日期，這樣單日飲水量才會一起刷新。
export function usePhysioRecordsByDate(date: string | null) {
  const { data, error, isLoading } = useSWR(
    date ? `/api/physio?date=${date}` : null,
    fetcher,
    dateListConfig
  )
  return {
    records: data?.records ?? null,
    isLoading,
    error,
  }
}

// ----------------------------------------------------------------------------
// useWeightProjection()
// ----------------------------------------------------------------------------
// 對應 API：GET /api/dashboard/weight-projection
// ⚠️ 注意：components/WeightProjectionCard.tsx 目前是自己另外寫
// useEffect + fetch，完全沒用到這個 hook，建議改成呼叫這裡。
export function useWeightProjection() {
  const { data, error, isLoading } = useSWR(
    '/api/dashboard/weight-projection',
    fetcher,
    defaultConfig
  )
  return {
    projection: data ?? null,
    isLoading,
    error,
  }
}

// ----------------------------------------------------------------------------
// useProfileTarget()
// ----------------------------------------------------------------------------
// 對應 API：GET /api/dashboard/profile-target
//
// ⚠️ 這支 API 實際回傳欄位比只有熱量目標多，已對照 route.ts 補齊：
// calorieTarget、targetWeight、heightCm、gender、waistHealthyMax、targetRatioText。
// PhysioDashboard.tsx 會用 targetWeight／gender／waistHealthyMax 分別畫
// 體重/體脂/腰圍圖表的目標線，漏帶任何一個都會讓對應圖表少一條參考線。
//
// 建議套用的地方：DietDashboard.tsx（用 calorieTarget/targetRatioText）、
// PhysioDashboard.tsx（用 targetWeight/gender/waistHealthyMax/heightCm）
export function useProfileTarget() {
  const { data, error, isLoading } = useSWR(
    '/api/dashboard/profile-target',
    fetcher,
    defaultConfig
  )
  return {
    calorieTarget: data?.calorieTarget ?? 1600,
    targetRatioText: data?.targetRatioText ?? null,
    targetWeight: data?.targetWeight ?? null,
    gender: data?.gender ?? null,
    waistHealthyMax: data?.waistHealthyMax ?? null,
    heightCm: data?.heightCm ?? null,
    isLoading,
    error,
  }
}

// ----------------------------------------------------------------------------
// useDietSummary(days)
// ----------------------------------------------------------------------------
// 對應 API：GET /api/dashboard/diet-summary?days=N
// 建議套用的地方：DietDashboard.tsx、WaterCaffeineChart.tsx
export function useDietSummary(days: number) {
  const { data, error, isLoading } = useSWR(
    `/api/dashboard/diet-summary?days=${days}`,
    fetcher,
    defaultConfig
  )
  return {
    records: data?.records ?? null,
    isLoading,
    error,
  }
}

// ----------------------------------------------------------------------------
// usePhysioSummary(days)
// ----------------------------------------------------------------------------
// 對應 API：GET /api/dashboard/physio-summary?days=N
//
// ⚠️ 這支 API 除了 records，還會回傳 heightCm（用於算BMI），
// PhysioDashboard.tsx 會拿它跟 profile-target 的 heightCm 做 fallback：
//   heightCm = physioData.heightCm ?? profileData.heightCm ?? null
// 只回傳 records 會讓 BMI 圖表永遠拿不到身高、判斷失效。
//
// 建議套用的地方：PhysioDashboard.tsx、WaterToiletChart.tsx、WaterCaffeineChart.tsx
export function usePhysioSummary(days: number) {
  const { data, error, isLoading } = useSWR(
    `/api/dashboard/physio-summary?days=${days}`,
    fetcher,
    defaultConfig
  )
  return {
    records: data?.records ?? null,
    heightCm: data?.heightCm ?? null,
    isLoading,
    error,
  }
}

// ============================================================================
// 快取失效（invalidate）輔助函式 —— 寫入成功後從這裡呼叫
// ============================================================================
//
// 為什麼不直接用各 hook 的 mutate 就好：
// 上面每個 hook 已經不再各自回傳 refresh/mutate，改成統一從這裡呼叫，原因是
// 像 diet-summary、physio-summary 這種帶 days 參數的資料，SWR 是把
// `/api/dashboard/diet-summary?days=7`、`?days=30`、`?days=90` 當成三把「不同
// 的鎖」分別快取。使用者只要曾經切換過 7天/30天/90天檢視，這三份資料就都
// 可能已經被記在瀏覽器的 SWR 快取裡。如果只刷新「目前畫面上那個 days」，
// 其他 days 版本的舊資料會繼續留著，等使用者切過去還是看到過期熱量。
//
// 這裡用 SWR 的全域 mutate() 搭配「key 篩選函式」，一次把所有符合某個路徑
// 開頭的 key 都標記成過期並觸發重新請求，不管當下畫面是哪個 days 版本。
//
// 每支 invalidate 函式都回傳 Promise（實際是 Promise.all 包住底下每個
// globalMutate 的 promise），這樣呼叫端「需要的話」可以 await 確認所有
// 重新驗證都跑完；但一般表單送出後的 UX 建議「不要 await」，讓使用者立刻
// 看到表單關閉/導頁，快取更新留在背景進行即可：
//   await fetch('/api/diet', { method: 'POST', body: JSON.stringify(payload) })
//   void invalidateDietCaches(dateKey) // 不加 await，背景更新
//   onSuccess()                        // 立刻關表單/導頁

function invalidateByPrefix(prefix: string) {
  return globalMutate((key) => typeof key === 'string' && key.startsWith(prefix), undefined, {
    revalidate: true,
  })
}

// 新增／編輯／刪除「飲食紀錄」成功後呼叫這個。
// date：被異動那筆紀錄的記錄日期字串 'YYYY-MM-DD'。有傳的話，該日期的單日
// 檢視（useDietRecordsByDate）會立刻一起刷新；沒有就只刷新彙總圖表。
//
// 範例（新增 2026-07-13 的飲食紀錄後）：
//   await fetch('/api/diet', { method: 'POST', body: JSON.stringify({...}) })
//   void invalidateDietCaches('2026-07-13')
//   // 效果：
//   // - /api/diet?date=2026-07-13            立即重抓，清單馬上出現新紀錄
//   // - /api/diet?days=7 / 30 / 90 ...        全部標記過期，重新整理
//   // - /api/dashboard/diet-summary?days=... 全部標記過期（7/30/90 都涵蓋），
//   //   dashboard 不會再顯示舊熱量
export async function invalidateDietCaches(date?: string) {
  await Promise.all([
    date ? globalMutate(`/api/diet?date=${date}`) : Promise.resolve(),
    invalidateByPrefix('/api/diet?days='),
    invalidateByPrefix('/api/dashboard/diet-summary?'),
  ])
}

// 新增／編輯／刪除「生理紀錄」成功後呼叫這個。
// date：被異動那筆紀錄的記錄日期字串 'YYYY-MM-DD'。有傳的話，該日期的單日
// 檢視（usePhysioRecordsByDate，例如飲食頁摘要卡的飲水量）會立刻一起刷新。
// 生理紀錄（含體重）還會同時影響 physio-summary 圖表跟 weight-projection
// 預估，所以這幾個都要一起刷新。
//
// ⚠️ 這裡只處理 SWR 管理的 key。PhysioRecordList.tsx 用的是
// usePhysioRecordsPaginated()（/api/physio?limit=&cursor=...），那是獨立的
// 分頁 local state、沒有走 SWR cache，不在這裡處理。實務上要在生理紀錄的
// 新增/編輯/刪除成功後，同時做兩件事：
//   refresh()                          // usePhysioRecordsPaginated() 自己的 refresh
//   void invalidatePhysioCaches(date)  // 這裡，處理 summary/單日/weight-projection
//
// 範例：
//   await fetch('/api/physio', { method: 'POST', body: JSON.stringify({...}) })
//   void invalidatePhysioCaches('2026-07-13')
export async function invalidatePhysioCaches(date?: string) {
  await Promise.all([
    date ? globalMutate(`/api/physio?date=${date}`) : Promise.resolve(),
    invalidateByPrefix('/api/physio?days='),
    invalidateByPrefix('/api/dashboard/physio-summary?'),
    globalMutate('/api/dashboard/weight-projection'),
  ])
}

// 更新「個人資料／目標」成功後呼叫這個。
// 目標熱量、目標體重改變會同時影響 profile-target 跟 weight-projection，
// 兩個都要一起刷新。
//
// 範例：
//   await fetch('/api/profile', { method: 'PUT', body: JSON.stringify({...}) })
//   void invalidateProfileCaches()
export async function invalidateProfileCaches() {
  await Promise.all([
    globalMutate('/api/profile'),
    globalMutate('/api/dashboard/profile-target'),
    globalMutate('/api/dashboard/weight-projection'),
  ])
}


// ============================================================================
// 分頁版本：/physio 完整列表頁使用，累積式載入（點「載入更多」時append到現有清單，不是換頁）
// 用普通的useState管理累積結果，不直接用SWR的內建分頁功能，
// 因為這裡需要「累積append」而不是「取代」的行為，邏輯更直覺
// ============================================================================
//
// usePhysioRecordsPaginated(pageSize)
// 對應 API：GET /api/physio?limit=N&cursor=xxx
// 這個不是 SWR-based，是獨立的分頁狀態管理，維持現狀即可。
// 目前已使用的地方：PhysioRecordList.tsx
//
// 寫入後怎麼處理：這個 hook 本身回傳的 refresh() 只重置這個分頁清單，
// 如果同時有生理紀錄異動，記得「另外」呼叫 invalidatePhysioCaches(date)，
// 讓 physio-summary、單日資料、weight-projection 也一併更新。
import { useState as useStateForPagination, useCallback as useCallbackForPagination, useEffect as useEffectForPagination } from 'react'

export function usePhysioRecordsPaginated(pageSize: number = 50) {
  const [records, setRecords] = useStateForPagination<any[]>([])
  const [cursor, setCursor] = useStateForPagination<string | null>(null)
  const [hasMore, setHasMore] = useStateForPagination(true)
  const [isLoading, setIsLoading] = useStateForPagination(true)
  const [isLoadingMore, setIsLoadingMore] = useStateForPagination(false)
  const [error, setError] = useStateForPagination<string | null>(null)

  const fetchPage = useCallbackForPagination(async (cursorParam: string | null, append: boolean) => {
    if (append) setIsLoadingMore(true)
    else setIsLoading(true)
    setError(null)

    try {
      const url = new URL('/api/physio', window.location.origin)
      url.searchParams.set('limit', String(pageSize))
      if (cursorParam) url.searchParams.set('cursor', cursorParam)

      const res = await fetch(url.toString().replace(window.location.origin, ''))
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'query_failed' }))
        throw new Error(body.error || 'query_failed')
      }
      const data = await res.json()

      setRecords((prev) => (append ? [...prev, ...data.records] : data.records))
      setCursor(data.nextCursor ?? null)
      setHasMore(Boolean(data.nextCursor))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [pageSize])

  useEffectForPagination(() => {
    fetchPage(null, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = useCallbackForPagination(() => {
    if (cursor && !isLoadingMore) fetchPage(cursor, true)
  }, [cursor, isLoadingMore, fetchPage])

  const refresh = useCallbackForPagination(() => {
    fetchPage(null, false)
  }, [fetchPage])

  return { records, isLoading, isLoadingMore, error, hasMore, loadMore, refresh }
}