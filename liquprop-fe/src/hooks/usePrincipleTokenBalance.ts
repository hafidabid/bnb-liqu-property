import { useAccount, useReadContract } from 'wagmi'
import { PrincipleTokenABI } from '@/lib/abis/PrincipleTokenABI'

/**
 * Reads the connected wallet's ERC1155 balance for a specific property token.
 * Returns raw whole-unit balance (no 18-decimal scaling — ERC1155 tokens are whole units).
 */
export function usePrincipleTokenBalance(
  contractAddress: `0x${string}` | null | undefined,
  tokenId: string | number | undefined,
) {
  const { address } = useAccount()

  const { data, isLoading, refetch } = useReadContract({
    address: contractAddress ?? undefined,
    abi: PrincipleTokenABI,
    functionName: 'balanceOf',
    args: address && tokenId !== undefined ? [address, BigInt(tokenId)] : undefined,
    query: {
      enabled: Boolean(contractAddress && address && tokenId !== undefined),
    },
  })

  const balance = data as bigint | undefined

  return { balance, isLoading, refetch }
}
