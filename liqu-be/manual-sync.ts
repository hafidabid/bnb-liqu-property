import { runSync } from './app/modules/indexer/indexer.cron.js'
import dotenv from 'dotenv'
import {
    syncRegisteredProperties,
    syncFractionalizedPositions,
    checkPropertyMaturation,
    syncPropertyTokenId,
} from './app/modules/property/property.service.js'


// Load environment variables
dotenv.config()

const run = async () => {
    try {
        console.log('[Manual Sync] Triggering manual indexer synchronization...')
        await runSync()

    } catch (err) {
        console.error('[Manual Sync] Failed:', err)
    } finally {
        process.exit(0)
    }
}

if (process.argv[2] === 'sync-properties') {
    syncRegisteredProperties()
} else if (process.argv[2] === 'sync-positions') {
    syncFractionalizedPositions()
} else if (process.argv[2] === 'check-maturation') {
    checkPropertyMaturation()
} else if (process.argv[2] === 'sync-property-token-id') {
    syncPropertyTokenId()
} else {
    run()
}
