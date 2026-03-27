import { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import { startPoller, subscribe } from '@/lib/gasPriceSingleton'

/**
 * Returns the current network gas price as a Gwei string (e.g. "0.025").
 * All consumers share a single 15-second RPC poller — calling this hook
 * from multiple components does NOT create extra network requests.
 */
export function useGasPrice(): string | null {
    const publicClient = usePublicClient()
    const [gwei, setGwei] = useState<string | null>(null)

    useEffect(() => {
        if (!publicClient) return

        // Give the singleton a fetch function backed by this client
        const fetchFn = async () => {
            const price = await publicClient.getGasPrice()
            return parseFloat(formatUnits(price, 9)).toFixed(4)
        }

        startPoller(fetchFn)
        const unsubscribe = subscribe(setGwei)
        return unsubscribe
    }, [publicClient])

    return gwei
}
