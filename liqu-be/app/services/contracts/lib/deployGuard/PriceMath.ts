/**
 * Uniswap V3-style price conversion helpers (Q64.96).
 * Reference: https://ethereum.stackexchange.com/questions/98685/computing-the-uniswap-v3-pair-price-from-q64-96-number
 */

const Q192 = 2n ** 192n

/**
 * Integer square root (floor(sqrt(n))) for bigint.
 * Used to mirror Solidity's FixedPointMathLib.sqrt.
 */
function sqrtBigInt(value: bigint): bigint {
  if (value < 0n) throw new Error('sqrt of negative number')
  if (value < 2n) return value

  let x = value
  let y = (x + 1n) / 2n
  while (y < x) {
    x = y
    y = (x + value / x) / 2n
  }

  return x
}

/**
 * Converts Uniswap V3 sqrtPriceX96 (Q64.96) to human-readable price.
 * price = (sqrtPriceX96^2 * 10^token0Decimals) / 2^192
 *
 * @param sqrtPriceX96 - Q64.96 sqrt price from the pool
 * @param token0Decimals - decimals of token0 (e.g. 18)
 * @returns price as uint256 (bigint)
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  token0Decimals: number
): bigint {
  const tenPowDecimals = 10n ** BigInt(token0Decimals)
  const numerator = sqrtPriceX96 * sqrtPriceX96 * tenPowDecimals

  return numerator / Q192
}

/**
 * Converts human-readable price to Uniswap V3 sqrtPriceX96 (Q64.96).
 * adjustedPrice = (price * 2^192) / 10^token0Decimals
 * sqrtPriceX96 = sqrt(adjustedPrice)
 *
 * @param price - human-readable price (uint256)
 * @param token0Decimals - decimals of token0 (e.g. 18)
 * @returns sqrtPriceX96 as uint160 (bigint)
 */
export function priceToSqrtPriceX96(
  price: bigint,
  token0Decimals: number
): bigint {
  const numerator = price * Q192
  const tenPowDecimals = 10n ** BigInt(token0Decimals)
  const adjustedPrice = numerator / tenPowDecimals
  const sqrtPrice = sqrtBigInt(adjustedPrice)
  // uint160: cap at 2^160 - 1 (Uniswap uses uint160 for sqrtPriceX96)
  const MAX_UINT160 = 2n ** 160n - 1n

  return sqrtPrice > MAX_UINT160 ? MAX_UINT160 : sqrtPrice
}
