/**
 * portfolio.sync.ts
 *
 * Syncs on-chain token balances + latest prices into UserTokenCache.
 * Cache invalidation strategy:
 *   - If balance/price/yield changed  → upsert (atomic delete+replace)
 *   - If balance dropped to zero      → delete cache entry
 *   - If nothing changed              → skip (no DB write, no false invalidation)
 */

import prisma from '#prisma/prisma'
import publicClient from '#app/services/contracts/client/publicClient'
import PrincipleTokenABI from '#app/services/contracts/abis/PrincipleTokenABI'

// Minimum relative price change that triggers a cache invalidation (0.01%)
const PRICE_CHANGE_EPSILON = 0.0001

// ─── On-chain helpers ──────────────────────────────────────────────────────────

async function getTokenBalance(
  ownerAddress: string,
  tokenId: bigint,
  ptAddress: `0x${string}`
): Promise<bigint> {
  try {
    return (await (publicClient.readContract as any)({
      address: ptAddress,
      abi: PrincipleTokenABI,
      functionName: 'balanceOf',
      args: [ownerAddress as `0x${string}`, tokenId],
    })) as bigint
  } catch {
    return 0n
  }
}

async function getPosition(
  tokenId: bigint,
  ptAddress: `0x${string}`
): Promise<{ totalSupply: bigint; presalePrice: bigint; yieldToken: string } | null> {
  try {
    return (await (publicClient.readContract as any)({
      address: ptAddress,
      abi: PrincipleTokenABI,
      functionName: 'getIdToPosition',
      args: [tokenId],
    })) as { totalSupply: bigint; presalePrice: bigint; yieldToken: string }
  } catch {
    return null
  }
}

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

async function getERC20Balance(
  ownerAddress: string,
  tokenAddress: `0x${string}`
): Promise<bigint> {
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

function resolveMintAmount(totalSupplyRaw: number): number {
  return totalSupplyRaw <= 3
    ? ([1000, 5000, 10000, 100000][totalSupplyRaw] ?? 1000)
    : totalSupplyRaw
}

// ─── Change detection ─────────────────────────────────────────────────────────

function hasChanged(
  existing: {
    balance: string
    currentPrice: { toString(): string }
    pendingYield: { toString(): string }
  } | null,
  next: { balance: string; currentPrice: number; pendingYield: number }
): boolean {
  if (!existing) return true
  if (existing.balance !== next.balance) return true

  const prevPrice = Number(existing.currentPrice.toString())
  const prevYield = Number(existing.pendingYield.toString())

  const priceRelDiff =
    prevPrice === 0
      ? next.currentPrice !== 0 ? 1 : 0
      : Math.abs(prevPrice - next.currentPrice) / prevPrice

  if (priceRelDiff > PRICE_CHANGE_EPSILON) return true
  if (Math.abs(prevYield - next.pendingYield) > 0.000001) return true

  return false
}

// ─── Main sync function ───────────────────────────────────────────────────────

/**
 * Syncs UserTokenCache for all users (or a single wallet if targetWallet provided).
 *
 * Called by:
 *   - portfolio.cron.ts  (every 45s, all users)
 *   - portfolio.service.ts (on cache miss for a specific wallet, immediate)
 */
export async function syncUserTokenCaches(targetWallet?: string): Promise<void> {
  const contract = await prisma.contract.findFirst({
    where: { contractName: 'CH_PT' },
  })
  if (!contract) {
    console.error('[PortfolioSync] CH_PT contract not found')
    return
  }

  const chainId = contract.chainId
  const ptAddress = contract.address as `0x${string}`

  // Properties eligible for portfolio tracking
  const properties = await prisma.property.findMany({
    where: {
      tokenId: { not: null },
      status: { in: ['TOKENIZED', 'LISTED', 'TOKEN_LIVE'] },
    },
  })
  if (properties.length === 0) return

  // Wallets to sync
  const users = targetWallet
    ? [{ walletAddress: targetWallet }]
    : await prisma.user.findMany({ select: { walletAddress: true } })
  if (users.length === 0) return

  // Pre-load aggregate holder yield per property (avoid N+1 inside the loop)
  const yieldGroups = await prisma.yieldDistribution.groupBy({
    by: ['propertyId'],
    _sum: { holderAmount: true },
  })
  const holderYieldMap: Record<string, number> = {}
  for (const y of yieldGroups) {
    holderYieldMap[y.propertyId] = Number(y._sum.holderAmount ?? 0) / 1e6
  }

  // Pre-load latest price snapshot per property (single query, no per-property queries)
  const latestSnapshots = await prisma.priceSnapshot.findMany({
    where: {
      propertyId: { in: properties.map((p) => p.id) },
      chainId,
    },
    orderBy: { snapshotAt: 'desc' },
    distinct: ['propertyId'],
  })
  const latestPriceMap: Record<string, number> = {}
  for (const snap of latestSnapshots) {
    latestPriceMap[snap.propertyId] = Number(snap.tokenPrice)
  }

  // Cache on-chain positions to avoid redundant RPC calls across users
  const positionCache: Record<string, { totalSupply: bigint; presalePrice: bigint; yieldToken: string } | null> = {}

  console.log(
    `[PortfolioSync] Syncing ${users.length} user(s) × ${properties.length} properties`
  )

  let updated = 0
  let skipped = 0
  let deleted = 0

  for (const user of users) {
    for (const property of properties) {
      if (!property.tokenId) continue

      try {
        const balance = await getTokenBalance(
          user.walletAddress,
          property.tokenId,
          ptAddress
        )

        // ── For TOKEN_LIVE: also check ERC-20 yield token balance ─────────
        // Buyers from the secondary market (Uniswap) receive ERC-20 yield tokens,
        // not ERC-1155 principle tokens, so we must add both.
        const isLiveEarly = property.status === 'TOKEN_LIVE'
        if (isLiveEarly) {
          if (!(property.id in positionCache)) {
            positionCache[property.id] = await getPosition(property.tokenId, ptAddress)
          }
          const earlyPos = positionCache[property.id]
          const yt = earlyPos?.yieldToken ?? ''
          const isValidYT = yt && yt !== '0x0000000000000000000000000000000000000000'
          if (isValidYT) {
            const erc20Raw = await getERC20Balance(user.walletAddress, yt as `0x${string}`)
            // Yield tokens have 18 decimals; convert to token-count units
            const erc20Formatted = Number(erc20Raw) / 1e18
            if (erc20Formatted > 0) {
              // Encode combined key so hasChanged detects ERC-20 balance changes too
              const combinedKey = `${balance}:${erc20Raw.toString()}`
              const existing = await prisma.userTokenCache.findUnique({
                where: {
                  walletAddress_propertyId_chainId: {
                    walletAddress: user.walletAddress,
                    propertyId: property.id,
                    chainId,
                  },
                },
                select: { balance: true, currentPrice: true, pendingYield: true },
              })

              if (!(property.id in positionCache)) {
                positionCache[property.id] = await getPosition(property.tokenId, ptAddress)
              }
              const pos2 = positionCache[property.id]
              const totalSupplyRaw2 = pos2?.totalSupply ? Number(pos2.totalSupply) : 1000
              const mintAmount2 = resolveMintAmount(totalSupplyRaw2)
              const presaleOnChain2 = pos2?.presalePrice ? Number(pos2.presalePrice) / 1e6 : 1
              const currentPrice2 = latestPriceMap[property.id] ?? presaleOnChain2
              const holderYieldTotal2 = holderYieldMap[property.id] ?? 0
              const yieldPerToken2 = mintAmount2 > 0 ? holderYieldTotal2 / mintAmount2 : 0

              const combinedFormatted = Number(balance) + erc20Formatted
              const pendingYield2 = combinedFormatted * yieldPerToken2
              const currentValue2 = combinedFormatted * currentPrice2

              const nextValues2 = { balance: combinedKey, currentPrice: currentPrice2, pendingYield: pendingYield2 }
              if (!hasChanged(existing, nextValues2)) {
                skipped++
                continue
              }

              await prisma.userTokenCache.upsert({
                where: {
                  walletAddress_propertyId_chainId: {
                    walletAddress: user.walletAddress,
                    propertyId: property.id,
                    chainId,
                  },
                },
                update: {
                  tokenId: property.tokenId,
                  balance: combinedKey,
                  balanceFormatted: combinedFormatted,
                  currentPrice: currentPrice2,
                  pendingYield: pendingYield2,
                  currentValue: currentValue2,
                  propertyName: property.name,
                  propertyAddress: property.address,
                  propertyStatus: property.status,
                  syncedAt: new Date(),
                },
                create: {
                  walletAddress: user.walletAddress,
                  propertyId: property.id,
                  tokenId: property.tokenId,
                  chainId,
                  balance: combinedKey,
                  balanceFormatted: combinedFormatted,
                  currentPrice: currentPrice2,
                  pendingYield: pendingYield2,
                  currentValue: currentValue2,
                  propertyName: property.name,
                  propertyAddress: property.address,
                  propertyStatus: property.status,
                },
              })

              updated++
              console.log(
                `[PortfolioSync] Cache updated (ERC-20 live buyer): ${user.walletAddress} / ${property.id} (combined=${combinedFormatted}, price=${currentPrice2})`
              )
              continue
            }
          }
        }

        // ── Balance is zero: invalidate cache entry if one exists ──────────
        if (balance === 0n) {
          const result = await prisma.userTokenCache.deleteMany({
            where: {
              walletAddress: user.walletAddress,
              propertyId: property.id,
              chainId,
            },
          })
          if (result.count > 0) {
            deleted++
            console.log(
              `[PortfolioSync] Invalidated (zero balance): ${user.walletAddress} / ${property.id}`
            )
          }
          continue
        }

        // ── Has balance: compute fresh values ─────────────────────────────
        const balanceFormatted = Number(balance)

        // Resolve on-chain position (cached per property across all users)
        if (!(property.id in positionCache)) {
          positionCache[property.id] = await getPosition(property.tokenId, ptAddress)
        }
        const position = positionCache[property.id]
        const totalSupplyRaw = position?.totalSupply ? Number(position.totalSupply) : 1000
        const mintAmount = resolveMintAmount(totalSupplyRaw)

        // For TOKEN_LIVE: use latest pool snapshot price; fall back to presale price from chain
        // For TOKENIZED/LISTED (no pool yet): use on-chain presalePrice / 1e6
        const isLive = property.status === 'TOKEN_LIVE'
        const presaleOnChain = position?.presalePrice ? Number(position.presalePrice) / 1e6 : 1
        const currentPrice = isLive
          ? (latestPriceMap[property.id] ?? presaleOnChain)
          : presaleOnChain

        // Yield only accrues after TOKEN_LIVE — show 0 for fundraise/pending modes
        const holderYieldTotal = isLive ? (holderYieldMap[property.id] ?? 0) : 0
        const yieldPerToken = isLive && mintAmount > 0 ? holderYieldTotal / mintAmount : 0
        const pendingYield = balanceFormatted * yieldPerToken
        const currentValue = balanceFormatted * currentPrice

        const nextValues = {
          balance: balance.toString(),
          currentPrice,
          pendingYield,
        }

        // ── Change detection: read existing cache entry ───────────────────
        const existing = await prisma.userTokenCache.findUnique({
          where: {
            walletAddress_propertyId_chainId: {
              walletAddress: user.walletAddress,
              propertyId: property.id,
              chainId,
            },
          },
          select: { balance: true, currentPrice: true, pendingYield: true },
        })

        if (!hasChanged(existing, nextValues)) {
          skipped++
          continue
        }

        // ── Data changed: invalidate old cache + write fresh data ─────────
        await prisma.userTokenCache.upsert({
          where: {
            walletAddress_propertyId_chainId: {
              walletAddress: user.walletAddress,
              propertyId: property.id,
              chainId,
            },
          },
          update: {
            tokenId: property.tokenId,
            balance: nextValues.balance,
            balanceFormatted,
            currentPrice,
            pendingYield,
            currentValue,
            propertyName: property.name,
            propertyAddress: property.address,
            propertyStatus: property.status,
            syncedAt: new Date(),
          },
          create: {
            walletAddress: user.walletAddress,
            propertyId: property.id,
            tokenId: property.tokenId,
            chainId,
            balance: nextValues.balance,
            balanceFormatted,
            currentPrice,
            pendingYield,
            currentValue,
            propertyName: property.name,
            propertyAddress: property.address,
            propertyStatus: property.status,
          },
        })

        updated++
        console.log(
          `[PortfolioSync] Cache updated: ${user.walletAddress} / ${property.id} (balance=${nextValues.balance}, price=${currentPrice})`
        )
      } catch (err) {
        console.error(
          `[PortfolioSync] Error for ${user.walletAddress}/${property.id}:`,
          err
        )
      }
    }
  }

  console.log(
    `[PortfolioSync] Done. updated=${updated}, skipped=${skipped}, invalidated=${deleted}`
  )
}
