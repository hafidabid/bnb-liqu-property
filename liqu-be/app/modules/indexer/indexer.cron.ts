import cron from 'node-cron'
import {
  syncRegisteredProperties,
  syncFractionalizedPositions,
  checkPropertyMaturation,
  syncPropertyTokenId,
  syncDeployGuardTxs,
  syncPendingBlockchainTransactions,
} from '../property/property.service.js'

export const runSync = async () => {
  console.log('[Cron] Starting Indexer Synchronization...')
  try {
    await syncPropertyTokenId()
    await syncRegisteredProperties()
    await syncFractionalizedPositions()
    await checkPropertyMaturation()
    await syncDeployGuardTxs()
    await syncPendingBlockchainTransactions()
    console.log('[Cron] Indexer Synchronization Completed.')
  } catch (error) {
    console.error('[Cron Error] Failed during indexer sync:', error)
  }
}

export const startIndexerCronJobs = () => {
  if (process.env.RUN_CRONJOB === 'false') {
    console.log('[Cron] Cron jobs disabled via RUN_CRONJOB environment variable.')

    return
  }

  // Run every 2 minutes
  cron.schedule('* * * * *', async () => {
    await runSync()
  })
}
