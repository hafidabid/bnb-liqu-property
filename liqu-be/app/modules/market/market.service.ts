import prisma from '#prisma/prisma'
import publicClient from '#app/services/contracts/client/publicClient'
import PrincipleTokenABI from '#app/services/contracts/abis/PrincipleTokenABI'
import { getSqrtRatioAtTick } from '#app/services/contracts/lib/deployGuard/TickMath'
import { sqrtPriceX96ToPrice } from '#app/services/contracts/lib/deployGuard/PriceMath'
import { getPoolUsdcPrice } from '#app/services/contracts/lib/pool/poolPrice'
import RegistryService from '#app/services/registry/registry.service'

import type { MarketStats, PricePoint } from './market.interface.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FLOOR_TICK = -277320

/**
 * Converts a Uniswap V3 tick to USDC price (6 decimals → human-readable).
 * Uses proper Q64.96 math: getSqrtRatioAtTick → sqrtPriceX96ToPrice with 18 token decimals.
 */
function tickToUsdcPrice(tick: number): number {
  const sqrtPriceX96 = getSqrtRatioAtTick(tick)
  const rawPrice = sqrtPriceX96ToPrice(sqrtPriceX96, 18)

  return Number(rawPrice) / 1e6
}

async function getPosition(tokenId: bigint, ptAddress: `0x${string}`) {
  try {
    const pos = await (publicClient.readContract as any)({
      address: ptAddress,
      abi: PrincipleTokenABI,
      functionName: 'getIdToPosition',
      args: [tokenId],
    }) as {
      owner: string
      tokenId: bigint
      timestamp: bigint
      expiry: bigint
      pool: string
      presaleAmount: bigint
      totalSupply: bigint
      presalePrice: bigint
      guard: string
      yieldToken: string
    }

    return pos
  } catch {
    return null
  }
}


function resolveMintAmount(totalSupplyRaw: number): number {
  return totalSupplyRaw <= 3
    ? ([1000, 5000, 10000, 100000][totalSupplyRaw] ?? 1000)
    : totalSupplyRaw
}

// ─── Services ─────────────────────────────────────────────────────────────────

export const getMarketStats = async (tokenId: string, chainId: string): Promise<MarketStats> => {
  const tokenIdBig = BigInt(tokenId)

  const contract = await prisma.contract.findFirst({
    where: { contractName: 'CH_PT', chainId },
  })
  if (!contract) throw new Error('Contract not found')

  // 1. Read position from chain
  const position = await getPosition(tokenIdBig, contract.address as `0x${string}`)

  // 2. Find the property in DB to get yield history + latest price snapshot
  const property = await prisma.property.findFirst({
    where: { tokenId: tokenIdBig },
    include: {
      yieldDistributions: true,
      priceSnapshots: {
        orderBy: { snapshotAt: 'desc' },
        take: 1,
      },
    },
  })

  const yieldDistributions = property?.yieldDistributions ?? []

  // 3. Aggregate yield totals (amounts stored as Decimal with 18 decimals, USDC 6 dec)
  const holderYieldTotal = yieldDistributions.reduce(
    (acc, d) => acc + Number(d.holderAmount) / 1e6,
    0
  )
  const baselineYieldTotal = yieldDistributions.reduce(
    (acc, d) => acc + Number(d.baselineAmount) / 1e6,
    0
  )
  const platformFeeTotal = yieldDistributions.reduce(
    (acc, d) => acc + Number(d.platformFee) / 1e6,
    0
  )
  const totalYieldDistributed = holderYieldTotal + baselineYieldTotal + platformFeeTotal

  // 4. Resolve supply + presale price
  const totalSupplyRaw = position?.totalSupply ? Number(position.totalSupply) : 1000
  const presalePriceRaw = position?.presalePrice ? Number(position.presalePrice) / 1e6 : 1
  const presaleAmountRaw = position?.presaleAmount ? Number(position.presaleAmount) / 1e6 : 0
  const mintAmount = resolveMintAmount(totalSupplyRaw)
  const presalePrice = presalePriceRaw > 0 ? presalePriceRaw : (mintAmount > 0 ? presaleAmountRaw / mintAmount : 1)

  // 5. Current price: prefer live pool slot0, fall back to yield-accumulated estimate
  const yieldToken = position?.yieldToken ?? ''
  const [routerAddr, usdcAddr] = await Promise.all([
    RegistryService.getContractAddress(chainId, 'SWAP_ROUTER_PT'),
    RegistryService.getContractAddress(chainId, 'CH_USDC'),
  ])
  let livePrice: number | null = null
  if (routerAddr && usdcAddr && yieldToken && yieldToken !== '0x0000000000000000000000000000000000000000') {
    const result = await getPoolUsdcPrice(routerAddr, yieldToken as `0x${string}`, usdcAddr)
    livePrice = result?.price ?? null
  }

  // Fallback chain:
  // 1. Live pool slot0 price  (most fresh, may fail if pool unresolvable)
  // 2. Latest DB price snapshot (captured by backfill cron from Swap events)
  // 3. Presale price + accrued yield (static, always an integer if no yield)
  const latestSnapshot = property?.priceSnapshots?.[0] ?? null
  const snapshotPrice = latestSnapshot ? Number(latestSnapshot.tokenPrice) : null
  const currentPrice = livePrice ?? snapshotPrice ?? (presalePrice + (mintAmount > 0 ? holderYieldTotal / mintAmount : 0))

  // 6. Baseline price: use proper tick → sqrtPriceX96 → USDC conversion
  const baselineFloor = tickToUsdcPrice(FLOOR_TICK)
  const baselinePrice = baselineFloor + (mintAmount > 0 ? baselineYieldTotal / mintAmount : 0)

  // 7. TVL + liquidity
  const tvl = mintAmount * currentPrice
  const liquidity = presaleAmountRaw + baselineYieldTotal

  return {
    tokenId,
    currentPrice,
    baselinePrice,
    tvl,
    liquidity,
    totalYieldDistributed,
    holderYieldTotal,
    baselineYieldTotal,
    platformFeeTotal,
  }
}

export type PriceRange = '1m' | '5m' | '30m' | '1h' | '12h' | '1d' | '1w' | '1mo' | 'all'

function sinceFromRange(range: PriceRange): Date | null {
  const now = Date.now()
  const ms: Record<PriceRange, number | null> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1mo': 30 * 24 * 60 * 60 * 1000,
    'all': null,
  }
  const delta = ms[range]

  return delta !== null ? new Date(now - delta) : null
}

export const getPriceHistory = async (tokenId: string, chainId: string, range: PriceRange = 'all'): Promise<PricePoint[]> => {
  const tokenIdBig = BigInt(tokenId)

  const contract = await prisma.contract.findFirst({
    where: { contractName: 'CH_PT', chainId },
  })
  if (!contract) throw new Error('Contract not found')

  // 1. Read position from chain
  const position = await getPosition(tokenIdBig, contract.address as `0x${string}`)

  // 2. Get yield history and price snapshots from DB
  const property = await prisma.property.findFirst({
    where: { tokenId: tokenIdBig },
    include: {
      yieldDistributions: { orderBy: { distributedAt: 'asc' } },
      priceSnapshots: { orderBy: { snapshotAt: 'asc' } },
    },
  })

  const yieldDistributions = property?.yieldDistributions ?? []
  const snapshots = property?.priceSnapshots ?? []

  const totalSupplyRaw = position?.totalSupply ? Number(position.totalSupply) : 1000
  const mintAmount = resolveMintAmount(totalSupplyRaw)
  const presalePriceRaw = position?.presalePrice ? Number(position.presalePrice) / 1e6 : 1
  const presaleAmountRaw = position?.presaleAmount ? Number(position.presaleAmount) / 1e6 : 0
  const presalePrice = presalePriceRaw > 0 ? presalePriceRaw : (mintAmount > 0 ? presaleAmountRaw / mintAmount : 1)

  const baselineFloor = tickToUsdcPrice(FLOOR_TICK)

  const startDate = position?.timestamp
    ? new Date(Number(position.timestamp) * 1000).toISOString()
    : (property?.createdAt?.toISOString() ?? new Date().toISOString())

  // 3. Build initial point from presale
  const points: PricePoint[] = [
    {
      date: startDate,
      tokenPrice: presalePrice.toString(),
      baselinePrice: baselineFloor.toString(),
    },
  ]

  // 4. Merge yield distribution points
  let tokenPrice = presalePrice
  let baselinePrice = baselineFloor

  for (const dist of yieldDistributions) {
    const holderDelta = mintAmount > 0 ? Number(dist.holderAmount) / 1e6 / mintAmount : 0
    const baselineDelta = mintAmount > 0 ? Number(dist.baselineAmount) / 1e6 / mintAmount : 0
    tokenPrice += holderDelta
    baselinePrice += baselineDelta
    points.push({
      date: dist.distributedAt.toISOString(),
      tokenPrice: tokenPrice.toString(),
      baselinePrice: baselinePrice.toString(),
    })
  }

  // 5. Merge price snapshot points (from cron polling pool slot0)
  // Use .toString() on Prisma Decimal to preserve full precision
  for (const snap of snapshots) {
    points.push({
      date: snap.snapshotAt.toISOString(),
      tokenPrice: snap.tokenPrice.toString(),
      baselinePrice: snap.baselinePrice.toString(),
    })
  }

  // 6. Sort all points by date
  points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // 7. Filter by range
  const since = sinceFromRange(range)
  if (since) {
    const sinceMs = since.getTime()
    const filtered = points.filter(p => new Date(p.date).getTime() >= sinceMs)
    // Always include at least one point before the window for context
    if (filtered.length === 0) return points.slice(-1)
    const firstFilteredIdx = points.indexOf(filtered[0])
    if (firstFilteredIdx > 0) return [points[firstFilteredIdx - 1], ...filtered]

    return filtered
  }

  return points
}
