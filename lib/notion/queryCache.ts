// Notion API 查詢快取層
//
// 為什麼要做快取：Notion API 本身有速率限制且延遲較高（每次查詢通常要幾百毫秒），
// 如果每次使用者切換頁面/分頁都重新打一次API，會感覺明顯的等待時間。
//
// 策略：記憶體內快取（in-memory cache），依「使用者+資料庫ID+查詢條件」做cache key，
// 設定TTL（預設60秒）；當使用者透過本App「新增/更新/刪除」該資料庫的頁面時，
// 主動清除該資料庫的所有快取（invalidate），確保下一次查詢一定拿到最新資料，
// 不會有「明明剛存檔，畫面卻還是舊資料」的問題。
//
// 限制：這是單一伺服器行程內的記憶體快取。如果部署環境是多執行個體(多台伺服器/多個serverless實例)，
// 各實例之間的快取不會互相同步——A實例寫入後清除了A的快取，但B實例的舊快取還在，
// 直到B的TTL到期為止，B那邊仍可能顯示舊資料。多執行個體環境建議之後改用Redis等共享快取。
// 對目前單一小型應用（單一Vercel部署、流量不大）而言，這個限制通常不會造成明顯問題。

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cacheStore = new Map<string, CacheEntry<any>>()

const DEFAULT_TTL_MS = 60_000 // 60秒：個人資料/生理紀錄這類「不會頻繁變動」的資料，60秒內重複查詢直接吃快取

export function buildCacheKey(parts: (string | number | undefined | null)[]): string {
  return parts.filter((p) => p !== undefined && p !== null).join(':')
}

export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs })
}

// 清除某個資料庫底下的所有快取（不論查詢條件、不論哪個使用者），
// 用於「這個資料庫剛被寫入」之後，強制讓所有相關查詢下一次都重新打 Notion API
export function invalidateDatabaseCache(databaseId: string): void {
  const prefix = `db:${databaseId}:`
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix) || key.includes(`:${databaseId}:`)) {
      cacheStore.delete(key)
    }
  }
}

export function invalidateAllCache(): void {
  cacheStore.clear()
}

// 包裝 queryDatabase：先查快取，沒有才真的呼叫 Notion API 並寫入快取
export async function cachedQueryDatabase<T>(
  cacheKeyParts: (string | number | undefined | null)[],
  queryFn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const key = buildCacheKey(cacheKeyParts)
  const cached = getCached<T>(key)
  if (cached !== null) return cached

  const result = await queryFn()
  setCache(key, result, ttlMs)
  return result
}
