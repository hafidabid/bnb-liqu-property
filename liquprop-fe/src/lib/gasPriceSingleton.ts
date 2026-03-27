/**
 * Module-level singleton that polls the network gas price once every 15s
 * and shares the result with all subscribers. This prevents multiple
 * components (Header, GasSettingsDialog) each running their own setInterval
 * and hitting the RPC independently.
 */

type Subscriber = (gwei: string | null) => void

let currentGwei: string | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
const subscribers = new Set<Subscriber>()

let _fetchFn: (() => Promise<string | null>) | null = null
let _stopTimeoutId: ReturnType<typeof setTimeout> | null = null

function notify() {
    subscribers.forEach(fn => fn(currentGwei))
}

async function poll() {
    if (!_fetchFn) return
    try {
        const val = await _fetchFn()
        if (val !== currentGwei) {
            currentGwei = val
            notify()
        }
    } catch {
        // ignore RPC errors
    }
}

function startPoller(fetchFn: () => Promise<string | null>) {
    _fetchFn = fetchFn
    // Cancel any pending stop if someone resubscribes quickly
    if (_stopTimeoutId) {
        clearTimeout(_stopTimeoutId)
        _stopTimeoutId = null
    }

    if (intervalId !== null) return
    poll() // immediate first fetch
    intervalId = setInterval(poll, 15_000)
}

function stopPoller() {
    if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
    }
    _fetchFn = null
}

function subscribe(fn: Subscriber): () => void {
    subscribers.add(fn)
    // Deliver the current cached value immediately
    fn(currentGwei)
    return () => {
        subscribers.delete(fn)
        // Delay stopping the poller by 500ms to handle React StrictMode unmount/remount
        if (subscribers.size === 0) {
            _stopTimeoutId = setTimeout(() => {
                if (subscribers.size === 0) {
                    stopPoller()
                    currentGwei = null
                }
            }, 500)
        }
    }
}

export { startPoller, subscribe }
