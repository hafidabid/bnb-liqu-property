/**
 * Manual backfill script — seeds PriceSnapshot records for all TOKEN_LIVE properties.
 *
 * Pool is resolved via:
 *   PrincipleRouter.usdc()       → USDC address
 *   PrincipleRouter.FEE_TIER()   → fee tier
 *   PrincipleRouter.swapRouter() → SwapRouter02
 *   SwapRouter02.factory()       → Uniswap V3 Factory
 *   factory.getPool(yieldToken, usdc, feeTier) → pool
 *   pool.slot0() or Swap events  → price
 *
 * Run: bun scripts/backfill-price-history.ts [--blocks=3000]
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createPublicClient, http, fallback, parseAbiItem, PublicClient } from 'viem'
import { getSqrtRatioAtTick } from '../app/services/contracts/lib/deployGuard/TickMath.js'
import { sqrtPriceX96ToPrice } from '../app/services/contracts/lib/deployGuard/PriceMath.js'
import PrincipleTokenABI from '../app/services/contracts/abis/PrincipleTokenABI.js'
import PrincipleRouterABI from '../app/services/contracts/abis/PrincipleRouterABI.js'

const FLOOR_TICK = -277320
const DEFAULT_BLOCK_RANGE = 3000n

const prisma = new PrismaClient()

function tickToUsdcPrice(tick: number): number {
  return Number(sqrtPriceX96ToPrice(getSqrtRatioAtTick(tick), 18)) / 1e6
}

const SwapEventAbi = parseAbiItem(
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)'
)

const SwapRouter02FactoryABI = [
  { name: 'factory', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
] as const

const UniswapV3FactoryABI = [
  {
    name: 'getPool', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const

const UniswapV3PoolSlot0ABI = [
  {
    name: 'slot0', type: 'function', stateMutability: 'view', inputs: [],
    outputs: [{ name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' }],
  },
] as const

async function resolvePool(client: PublicClient, routerAddr: string, yieldToken: string, usdcAddr: string): Promise<string | null> {
  // Use CH_USDC from DB — custom hackathon USDC, not PrincipleRouter.usdc()
  const [feeTier, swapRouter02] = await Promise.all([
    (client.readContract as any)({ address: routerAddr, abi: PrincipleRouterABI, functionName: 'FEE_TIER' }) as Promise<number>,
    (client.readContract as any)({ address: routerAddr, abi: PrincipleRouterABI, functionName: 'swapRouter' }) as Promise<string>,
  ])
  const factory = await (client.readContract as any)({ address: swapRouter02, abi: SwapRouter02FactoryABI, functionName: 'factory' }) as string
  const pool = await (client.readContract as any)({ address: factory, abi: UniswapV3FactoryABI, functionName: 'getPool', args: [yieldToken, usdcAddr, feeTier] }) as string

  return pool && pool !== '0x0000000000000000000000000000000000000000' ? pool : null
}

export async function backfill(blockParam: bigint = 1000n) {
  const blockRange = blockParam

  const properties = await prisma.property.findMany({
    where: { status: 'TOKEN_LIVE', tokenId: { not: null } },
  })

  if (properties.length === 0) {
    console.log('No TOKEN_LIVE properties found.')
    await prisma.$disconnect()

    return
  }

  const chains = await prisma.chain.findMany({
    where: { isActive: true },
    include: {
      rpcs: {
        where: { isActive: true },
        orderBy: { priority: 'desc' }
      }
    }
  })

  if (chains.length === 0) {
    console.log('No active chains found.')
    await prisma.$disconnect()

    return
  }

  console.log(`Found ${properties.length} TOKEN_LIVE properties.`)

  for (const chain of chains) {
    if (chain.rpcs.length === 0) {
      console.log(`\nChain ${chain.name} (${chain.chainId}) has no active RPCs, skipping.`)
      continue
    }

    const rpcTransports = chain.rpcs.map(r => http(r.url))
    const client = createPublicClient({
      transport: rpcTransports.length > 1 ? fallback(rpcTransports) : rpcTransports[0]
    }) as PublicClient

    const [ptContract, routerContract, usdcContract] = await Promise.all([
      prisma.contract.findFirst({ where: { chainId: chain.chainId, contractName: 'CH_PT' } }),
      prisma.contract.findFirst({ where: { chainId: chain.chainId, contractName: 'SWAP_ROUTER_PT' } }),
      prisma.contract.findFirst({ where: { chainId: chain.chainId, contractName: 'CH_USDC' } }),
    ])

    if (!ptContract || !routerContract || !usdcContract) {
      console.log(`\nMissing core contracts for chain ${chain.name} (${chain.chainId}), skipping.`)
      continue
    }

    const chainId = chain.chainId
    const baselinePrice = tickToUsdcPrice(FLOOR_TICK)

    let latestBlock: bigint
    try {
      latestBlock = await client.getBlockNumber()
    } catch (err) {
      console.error(`\nFailed to get block number for chain ${chain.name} (${chain.chainId}):`, err)
      continue
    }

    const fromBlock = latestBlock > blockRange ? latestBlock - blockRange : 0n

    console.log(`\n--- Processing Chain: ${chain.name} (${chain.chainId}) ---`)
    console.log(`Scanning blocks ${fromBlock} → ${latestBlock} (${blockRange} blocks)`)

    let processedForChain = 0

    for (const property of properties) {
      // Try to resolve position on this specific chain
      let yieldToken: string | null = null
      try {
        const pos = await (client.readContract as any)({
          address: ptContract.address as `0x${string}`,
          abi: PrincipleTokenABI,
          functionName: 'getIdToPosition',
          args: [property.tokenId!],
        }) as { yieldToken: string }
        yieldToken = pos?.yieldToken
      } catch (err) {
        // Likely not deployed on this chain (reverted), safe to skip
        continue
      }

      if (!yieldToken || yieldToken === '0x0000000000000000000000000000000000000000') {
        continue
      }

      processedForChain++
      console.log(`\nProcessing property ${property.id} (tokenId: ${property.tokenId})`)
      console.log(`  yieldToken: ${yieldToken}`)

      let poolAddress: string | null = null
      try {
        poolAddress = await resolvePool(client, routerContract.address, yieldToken, usdcContract.address)
      } catch (err) {
        console.error('  Failed to resolve pool:', err)
        continue
      }

      if (!poolAddress) {
        console.log('  Pool not found via factory, skipping')
        continue
      }
      console.log(`  Pool: ${poolAddress}`)

      // Try Swap event history first
      let swapLogs: any[] = []
      try {
        swapLogs = await client.getLogs({
          address: poolAddress as `0x${string}`,
          event: SwapEventAbi,
          fromBlock,
          toBlock: latestBlock,
        })
      } catch (err) {
        console.error('  Failed to fetch Swap logs:', err)
      }

      if (swapLogs.length === 0) {
        // Fall back to current slot0
        try {
          const slot0 = await (client.readContract as any)({
            address: poolAddress as `0x${string}`,
            abi: UniswapV3PoolSlot0ABI,
            functionName: 'slot0',
          }) as { sqrtPriceX96: bigint }

          if (slot0.sqrtPriceX96 && slot0.sqrtPriceX96 > 0n) {
            const tokenPrice = Number(sqrtPriceX96ToPrice(slot0.sqrtPriceX96, 18)) / 1e6
            await prisma.priceSnapshot.upsert({
              where: { propertyId_chainId_blockNumber: { propertyId: property.id, chainId, blockNumber: latestBlock } },
              update: { tokenPrice, baselinePrice },
              create: { propertyId: property.id, tokenId: property.tokenId!, chainId, tokenPrice, baselinePrice, blockNumber: latestBlock, source: 'CRON' },
            })
            console.log(`  Seeded initial snapshot: $${tokenPrice.toFixed(6)}`)
          }
        } catch (err) {
          console.error('  Failed to seed initial snapshot from slot0:', err)
        }
        continue
      }

      console.log(`  Found ${swapLogs.length} Swap events`)

      // Deduplicate by block (keep last swap per block)
      const byBlock = new Map<bigint, any>()
      for (const log of swapLogs) byBlock.set(log.blockNumber, log)

      let inserted = 0
      for (const [blockNumber, log] of byBlock) {
        try {
          const sqrtPriceX96 = log.args.sqrtPriceX96 as bigint
          if (!sqrtPriceX96 || sqrtPriceX96 === 0n) continue
          const tokenPrice = Number(sqrtPriceX96ToPrice(sqrtPriceX96, 18)) / 1e6
          const block = await client.getBlock({ blockNumber })
          await prisma.priceSnapshot.upsert({
            where: { propertyId_chainId_blockNumber: { propertyId: property.id, chainId, blockNumber } },
            update: { tokenPrice, baselinePrice, snapshotAt: new Date(Number(block.timestamp) * 1000) },
            create: {
              propertyId: property.id, tokenId: property.tokenId!, chainId, tokenPrice, baselinePrice,
              blockNumber, snapshotAt: new Date(Number(block.timestamp) * 1000), source: 'CRON',
            },
          })
          inserted++
        } catch (err) {
          console.error(`  Failed to insert snapshot at block ${blockNumber}:`, err)
        }
      }
      console.log(`  Inserted ${inserted} snapshots`)
    }

    if (processedForChain > 0) {
      await prisma.syncState.upsert({
        where: { chainId },
        update: { lastSyncedBlock: latestBlock },
        create: { chainId, lastSyncedBlock: latestBlock },
      })
      console.log(`\n  lastSyncedBlock=${latestBlock}`)
    } else {
      console.log('\n  No properties processed for this chain.')
    }
  }

  console.log('\nBackfill complete.')
  await prisma.$disconnect()
}

function main() {
  const blocksArg = process.argv.find(a => a.startsWith('--blocks='))
  backfill(blocksArg ? BigInt(blocksArg.split('=')[1]) : DEFAULT_BLOCK_RANGE).catch(err => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
}

main()
