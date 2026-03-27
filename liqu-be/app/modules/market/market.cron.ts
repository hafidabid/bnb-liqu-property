import cron from 'node-cron'
import { backfill } from '../../../scripts/backfill-price-history.js'

export async function syncPriceSnapshots() {
  await backfill(1200n)
}

export function startMarketPriceCronJobs() {
  if (process.env.RUN_CRONJOB === 'false') return

  cron.schedule('* * * * *', async () => {
    try {
      await syncPriceSnapshots()
    } catch (err) {
      console.error('[PriceCron] Error during price sync:', err)
    }
  })

  console.log('[PriceCron] Market price cron started (60s interval).')
}
