import { syncUserTokenCaches } from './portfolio.sync.js'

const SYNC_INTERVAL_MS = 45_000

let intervalHandle: ReturnType<typeof setInterval> | null = null

export function startPortfolioCronJobs() {
  if (process.env.RUN_CRONJOB === 'false') return

  intervalHandle = setInterval(async () => {
    try {
      await syncUserTokenCaches()
    } catch (err) {
      console.error('[PortfolioCron] Error during sync:', err)
    }
  }, SYNC_INTERVAL_MS)

  console.log('[PortfolioCron] Portfolio sync started (45s interval).')
}

export function stopPortfolioCronJobs() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
