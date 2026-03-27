/**
 * Helpers for reading the current USDC price of a yield token from its Uniswap V3 pool.
 *
 * Flow:
 *   PrincipleRouter.usdc()          → USDC address (no DB needed)
 *   PrincipleRouter.FEE_TIER()      → fee tier (uint24)
 *   PrincipleRouter.swapRouter()    → Uniswap V3 SwapRouter02 address
 *   SwapRouter02.factory()          → Uniswap V3 Factory address
 *   factory.getPool(yieldToken, usdc, feeTier) → pool address
 *   pool.slot0()                    → sqrtPriceX96 → USDC price
 */

import publicClient from '../../client/publicClient.js'
import { sqrtPriceX96ToPrice } from '../deployGuard/PriceMath.js'
import { PrincipleRouterABI } from '../../abis/PrincipleRouterABI.js'

const SwapRouter02FactoryABI = [
  { name: 'factory', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
] as const

const UniswapV3FactoryABI = [
  {
    name: 'getPool', type: 'function', stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const

const UniswapV3PoolSlot0ABI = [
  {
    name: 'slot0', type: 'function', stateMutability: 'view', inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
] as const

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

// ─── Pool address resolution ──────────────────────────────────────────────────

/**
 * Resolves the Uniswap V3 pool for a given yieldToken by traversing:
 *   PrincipleRouter → SwapRouter02 → Factory → getPool(yieldToken, usdc, feeTier)
 *
 * usdcAddress must be passed explicitly — use CH_USDC from the contracts DB
 * since this project uses a custom hackathon USDC, not the canonical one stored
 * in PrincipleRouter.usdc().
 */
export async function resolvePoolAddress(
  principleRouterAddress: `0x${string}`,
  yieldToken: `0x${string}`,
  usdcAddress: `0x${string}`
): Promise<`0x${string}` | null> {
  try {
    const [swapRouter02Addr, feeTier] = await Promise.all([
      (publicClient.readContract as any)({ address: principleRouterAddress, abi: PrincipleRouterABI, functionName: 'swapRouter' }) as Promise<`0x${string}`>,
      (publicClient.readContract as any)({ address: principleRouterAddress, abi: PrincipleRouterABI, functionName: 'FEE_TIER' }) as Promise<number>,
    ])
    const usdcAddr = usdcAddress

    const factoryAddr = await (publicClient.readContract as any)({
      address: swapRouter02Addr,
      abi: SwapRouter02FactoryABI,
      functionName: 'factory',
    }) as `0x${string}`

    const poolAddr = await (publicClient.readContract as any)({
      address: factoryAddr,
      abi: UniswapV3FactoryABI,
      functionName: 'getPool',
      args: [yieldToken, usdcAddr, feeTier],
    }) as `0x${string}`

    if (!poolAddr || poolAddr === ZERO_ADDRESS) return null
    return poolAddr
  } catch {
    return null
  }
}

// ─── Price reading ────────────────────────────────────────────────────────────

/**
 * Returns current USDC price, sqrtPriceX96, and latest blockNumber for a yieldToken.
 * Returns null if the pool doesn't exist or slot0 reverts.
 *
 * usdcAddress must be the CH_USDC from the contracts DB (custom hackathon token).
 */
export async function getPoolUsdcPrice(
  principleRouterAddress: `0x${string}`,
  yieldToken: `0x${string}`,
  usdcAddress: `0x${string}`
): Promise<{ price: number; sqrtPriceX96: bigint; blockNumber: bigint } | null> {
  const poolAddr = await resolvePoolAddress(principleRouterAddress, yieldToken, usdcAddress)
  if (!poolAddr) return null

  try {
    const [slot0, blockNumber] = await Promise.all([
      (publicClient.readContract as any)({
        address: poolAddr,
        abi: UniswapV3PoolSlot0ABI,
        functionName: 'slot0',
      }) as Promise<{ sqrtPriceX96: bigint }>,
      publicClient.getBlockNumber(),
    ])

    if (!slot0.sqrtPriceX96 || slot0.sqrtPriceX96 === 0n) return null

    const price = Number(sqrtPriceX96ToPrice(slot0.sqrtPriceX96, 18)) / 1e6
    return { price, sqrtPriceX96: slot0.sqrtPriceX96, blockNumber }
  } catch {
    return null
  }
}
