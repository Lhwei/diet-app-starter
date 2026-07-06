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


// ============================================
// 分頁版本：/physio 完整列表頁使用，累積式載入（點「載入更多」時append到現有清單，不是換頁）
// 用普通的useState管理累積結果，不直接用SWR的內建分頁功能，
// 因為這裡需要「累積append」而不是「取代」的行為，邏輯更直覺
// ============================================
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
