/**
 * Simple in-memory TTL cache with in-flight deduplication.
 * Two simultaneous calls with the same key share one HTTP request.
 */

type Entry<T> = { promise: Promise<T>; expiresAt: number }
const store = new Map<string, Entry<unknown>>()

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = store.get(key) as Entry<T> | undefined
  if (entry && entry.expiresAt > Date.now()) return entry.promise

  const promise = fn()
  store.set(key, { promise, expiresAt: Date.now() + ttlMs })
  // On error, remove so the next call retries instead of returning a rejected promise
  promise.catch(() => store.delete(key))
  return promise
}

export function invalidateCache(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
