import { useEffect, useState } from 'react'
import { useAccount, useChainId, useReadContract, useWatchContractEvent } from 'wagmi'
import { formatUnits } from 'viem'
import { MockUSDABI } from '@/lib/abis'
import { loadContractAddresses } from '@/lib/apicall/chains'

/**
 * Reads the current wallet's MockUSDC balance from the contract address
 * stored in the backend DB (via loadContractAddresses).
 *
 * Returns:
 *   balance   — raw bigint (6 decimals)
 *   formatted — human-readable string ("1,234.56")
 *   isLoading — true while fetching
 *   refetch   — manual refetch function
 */
export function useUSDCBalance() {
    const { address } = useAccount()
    const chainId = useChainId()
    const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>(undefined)

    // Resolve the MockUSD contract address from the DB for the current chain
    useEffect(() => {
        if (!chainId) return
        setContractAddress(undefined)
        loadContractAddresses(chainId)
            .then((addrs) => {
                // The contract is registered as "MockUSD" in the DB
                const addr = addrs['MockUSD'] ?? addrs['CH_USDC'] ?? addrs['USDC']
                setContractAddress(addr)
            })
            .catch(() => setContractAddress(undefined))
    }, [chainId])

    const {
        data: rawBalance,
        isLoading,
        refetch,
    } = useReadContract({
        address: contractAddress,
        abi: MockUSDABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: Boolean(contractAddress && address),
        },
    })

    // Auto-refresh when Transfer events involving our address are detected
    useWatchContractEvent({
        address: contractAddress,
        abi: MockUSDABI,
        eventName: 'Transfer',
        onLogs(logs) {
            const relevant = logs.some(
                (log) =>
                    (log as any).args?.from?.toLowerCase() === address?.toLowerCase() ||
                    (log as any).args?.to?.toLowerCase() === address?.toLowerCase(),
            )
            if (relevant) refetch()
        },
        enabled: Boolean(contractAddress && address),
    })

    const balance = rawBalance as bigint | undefined

    const formatted = balance !== undefined
        ? Number(formatUnits(balance, 6)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        : '—'

    return { balance, formatted, isLoading, refetch, contractAddress }
}
