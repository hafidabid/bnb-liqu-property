import prisma from '#prisma/prisma'
import publicClient from '#app/services/contracts/client/publicClient'
import PrincipleTokenABI from '#app/services/contracts/abis/PrincipleTokenABI'
import { getMarketStats } from '#app/modules/market/market.service'
import { syncUserTokenCaches } from './portfolio.sync.js'
import type { Portfolio, PortfolioHolding } from './portfolio.interface.js'

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

async function getERC20Balance(ownerAddress: string, tokenAddress: `0x${string}`): Promise<bigint> {
  try {
    return (await (publicClient.readContract as any)({
      address: tokenAddress,
      abi: ERC20_BALANCE_ABI,
      functionName: 'balanceOf',
      args: [ownerAddress as `0x${string}`],
    })) as bigint
  } catch {
    return 0n
  }
}

// Treat cache entries older than 2 minutes as stale (cron runs every 45s, so normally fresh)
const CACHE_STALE_MS = 2 * 60 * 1000

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTokenBalance(
  ownerAddress: string,
  tokenId: bigint,
  ptAddress: `0x${string}`
): Promise<bigint> {
  try {
    const balance = await (publicClient.readContract as any)({
      address: ptAddress,
      abi: PrincipleTokenABI,
      functionName: 'balanceOf',
      args: [ownerAddress as `0x${string}`, tokenId],
    }) as bigint

    return balance
  } catch {
    return 0n
  }
}

// ─── RPC fallback (used when cache is empty for a new user) ───────────────────

async function getPortfolioFromRPC(
  ownerAddress: string,
  chainId: string,
  ptAddress: `0x${string}`
): Promise<Portfolio> {
  const properties = await prisma.property.findMany({
    where: {
      tokenId: { not: null },
      // Include all phases where an investor may hold tokens
      status: { in: ['TOKENIZED', 'LISTED', 'TOKEN_LIVE'] },
    },
    include: { yieldDistributions: true },
  })

  const holdings: PortfolioHolding[] = []

  for (const property of properties) {
    if (!property.tokenId) continue

    const balance = await getTokenBalance(ownerAddress, property.tokenId, ptAddress)

    // For TOKEN_LIVE: also check ERC-20 yield token balance (secondary market buyers)
    let erc20Formatted = 0
    if (property.status === 'TOKEN_LIVE') {
      try {
        const pos = await (publicClient.readContract as any)({
          address: ptAddress,
          abi: PrincipleTokenABI,
          functionName: 'getIdToPosition',
          args: [property.tokenId],
        }) as { yieldToken?: string }
        const yt = pos?.yieldToken ?? ''
        if (yt && yt !== '0x0000000000000000000000000000000000000000') {
          const erc20Raw = await getERC20Balance(ownerAddress, yt as `0x${string}`)
          erc20Formatted = Number(erc20Raw) / 1e18
        }
      } catch {
        // ignore — position/yield token not available
      }
    }

    if (balance === 0n && erc20Formatted === 0) continue

    let marketStats
    try {
      marketStats = await getMarketStats(property.tokenId.toString(), chainId)
    } catch {
      marketStats = { currentPrice: 1, holderYieldTotal: 0 }
    }

    const balanceFormatted = Number(balance) + erc20Formatted
    const currentValue = balanceFormatted * marketStats.currentPrice

    // Rough pending-yield estimate until the cache is populated
    const yieldPerToken = 1000 > 0 ? marketStats.holderYieldTotal / 1000 : 0
    const pendingYield = balanceFormatted * yieldPerToken

    holdings.push({
      propertyId: property.id,
      tokenId: property.tokenId.toString(),
      propertyName: property.name,
      propertyAddress: property.address,
      propertyStatus: property.status,
      balance: balance.toString(),
      balanceFormatted,
      currentValue,
      pendingYield,
      claimedYield: 0,
      currentPrice: marketStats.currentPrice,
    })
  }

  return {
    holdings,
    totalValue: holdings.reduce((acc, h) => acc + h.currentValue, 0),
    totalInvested: holdings.reduce((acc, h) => acc + h.balanceFormatted, 0),
    totalPendingYield: holdings.reduce((acc, h) => acc + h.pendingYield, 0),
    totalClaimedYield: 0,
  }
}

// ─── Services ─────────────────────────────────────────────────────────────────

export const getPortfolio = async (ownerAddress: string, chainId: string): Promise<Portfolio> => {
  const contract = await prisma.contract.findFirst({
    where: { contractName: 'CH_PT', chainId },
  })
  if (!contract) throw new Error('Contract not found')

  // ── 1. Read from cache ────────────────────────────────────────────────────
  const cachedEntries = await prisma.userTokenCache.findMany({
    where: { walletAddress: ownerAddress, chainId },
  })

  // ── 2. New user: cache is empty → RPC now, trigger background sync ────────
  if (cachedEntries.length === 0) {
    // Fire-and-forget: populate cache so next request is fast
    syncUserTokenCaches(ownerAddress).catch((err) =>
      console.error('[Portfolio] Background sync error:', err)
    )
    return getPortfolioFromRPC(ownerAddress, chainId, contract.address as `0x${string}`)
  }

  // ── 3. Stale entries → trigger background refresh, still serve cache ──────
  const staleThreshold = new Date(Date.now() - CACHE_STALE_MS)
  const hasStale = cachedEntries.some((e) => e.syncedAt < staleThreshold)
  if (hasStale) {
    syncUserTokenCaches(ownerAddress).catch((err) =>
      console.error('[Portfolio] Background refresh error:', err)
    )
  }

  // ── 4. Build portfolio from cache ─────────────────────────────────────────
  const holdings: PortfolioHolding[] = cachedEntries
    .filter((e) => Number(e.balanceFormatted) > 0)
    .map((e) => ({
      propertyId: e.propertyId,
      tokenId: e.tokenId.toString(),
      propertyName: e.propertyName,
      propertyAddress: e.propertyAddress,
      propertyStatus: e.propertyStatus,
      balance: e.balance,
      balanceFormatted: Number(e.balanceFormatted),
      currentValue: Number(e.currentValue),
      pendingYield: Number(e.pendingYield),
      claimedYield: 0,
      currentPrice: Number(e.currentPrice),
    }))

  return {
    holdings,
    totalValue: holdings.reduce((acc, h) => acc + h.currentValue, 0),
    totalInvested: holdings.reduce((acc, h) => acc + h.balanceFormatted, 0),
    totalPendingYield: holdings.reduce((acc, h) => acc + h.pendingYield, 0),
    totalClaimedYield: 0,
  }
}

export const buildClaimYieldTx = async (tokenId: string, ownerAddress: string, chainId: string) => {
  const contract = await prisma.contract.findFirst({
    where: { contractName: 'CH_PT', chainId },
  })
  if (!contract) throw new Error('Contract not found')

  const [nonce, feeData] = await Promise.all([
    publicClient.getTransactionCount({ address: ownerAddress as `0x${string}` }),
    publicClient.estimateFeesPerGas(),
  ])

  return {
    to: contract.address,
    from: ownerAddress,
    data: '0x', // encode actual claimYield(tokenId) when ABI is finalized
    nonce,
    gas: '200000',
    maxFeePerGas: feeData.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
    type: 'eip1559',
  }
}

export const submitClaimYieldTx = async (tx: `0x${string}`) => {
  const txHash = await publicClient.sendRawTransaction({ serializedTransaction: tx })

  return { txHash }
}
