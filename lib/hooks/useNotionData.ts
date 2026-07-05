// SWR data hooks — 統一管理三個資料來源的前端快取
//
// 為什�麼要這樣做：
// 每次切換頁面時，如果直接用 useEffect + fetch，畫面一定會經歷「空白 -> loading -> 資料」
// 這個過程，就算後端Notion查詢再快，使用者還是會感覺到明顯的等待。
//
// SWR的策略：只要瀏覽器裡有上一次抓過的舊資料，就先立刻顯示（不管新舊），
// 同時在背景重新發request確認資料有沒有變，有變才更新畫面。
// 這樣「切換頁面」這個動作在使用者眼中幾乎是瞬間完成的，因為畫面從頭到尾都有內容。
//
// dedupingInterval: 同一個key在這段時間內重複呼叫不會真的重新發request，直接吃記憶體內的結果，
// 這跟後端的Notion查詢快取是兩層完全獨立的快取，可以疊加使用。

import useSWR, { SWRConfiguration } from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || 'request_failed')
  }
  return res.json()
}

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: true, // 切回這個瀏覽器分頁時，自動確認資料有沒有更新
  revalidateOnReconnect: true,
  dedupingInterval: 30_000, // 30秒內同一份資料重複請求，直接吃SWR自己的記憶體快取
  keepPreviousData: true, // 換頁時先保留舊資料在畫面上，不要讓畫面瞬間清空
}

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('/api/profile', fetcher, defaultConfig)
  return {
    profile: data?.record ?? null,
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useDietRecords(days: number = 30) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/diet?days=${days}`,
    fetcher,
    defaultConfig
  )
  return {
    records: data?.records ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function usePhysioRecords(days: number = 30) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/physio?days=${days}`,
    fetcher,
    defaultConfig
  )
  return {
    records: data?.records ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useWeightProjection() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/weight-projection',
    fetcher,
    defaultConfig
  )
  return {
    projection: data ?? null,
    isLoading,
    error,
    refresh: mutate,
  }
}
