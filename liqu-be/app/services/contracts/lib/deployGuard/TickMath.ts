/**
 * Math library for computing sqrt prices from ticks and vice versa.
 * Computes sqrt price for ticks of size 1.0001, i.e. sqrt(1.0001^tick) as fixed point Q64.96 numbers.
 * Supports prices between 2**-128 and 2**128.
 * Ported from Uniswap v3-core TickMath.sol
 */

/** The minimum tick that may be passed to getSqrtRatioAtTick (log base 1.0001 of 2**-128) */
export const MIN_TICK = -887272
/** The maximum tick that may be passed to getSqrtRatioAtTick (log base 1.0001 of 2**128) */
export const MAX_TICK = 887272

/** Minimum value from getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MIN_TICK) */
export const MIN_SQRT_RATIO = 4295128739n
/** Maximum value from getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MAX_TICK) */
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n

/**
 * Calculates sqrt(1.0001^tick) * 2^96
 * @param tick The input tick for the above formula
 * @returns sqrtPriceX96 A Q64.96 number representing the sqrt of the ratio (token1/token0) at the given tick
 */
export function getSqrtRatioAtTick(tick: number): bigint {
  const absTick = tick < 0 ? BigInt(-tick) : BigInt(tick)
  if (absTick > BigInt(MAX_TICK)) throw new Error('T')

  let ratio =
    (absTick & 1n) !== 0n
      ? 0xfffcb933bd6fad37aa2d162d1a594001n
      : 0x100000000000000000000000000000000n
  if ((absTick & 2n) !== 0n) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n
  if ((absTick & 4n) !== 0n) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n
  if ((absTick & 8n) !== 0n) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n
  if ((absTick & 16n) !== 0n) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n
  if ((absTick & 32n) !== 0n) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n
  if ((absTick & 64n) !== 0n) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n
  if ((absTick & 128n) !== 0n) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n
  if ((absTick & 256n) !== 0n) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n
  if ((absTick & 512n) !== 0n) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n
  if ((absTick & 1024n) !== 0n) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n
  if ((absTick & 2048n) !== 0n) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n
  if ((absTick & 4096n) !== 0n) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n
  if ((absTick & 8192n) !== 0n) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n
  if ((absTick & 16384n) !== 0n) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n
  if ((absTick & 32768n) !== 0n) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n
  if ((absTick & 65536n) !== 0n) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n
  if ((absTick & 131072n) !== 0n) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n
  if ((absTick & 262144n) !== 0n) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n
  if ((absTick & 524288n) !== 0n) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n

  if (tick > 0) {
    const maxU256 = (1n << 256n) - 1n
    ratio = maxU256 / ratio
  }

  // Q128.128 to Q128.96: divide by 1<<32, round up
  const ratioShifted = ratio >> 32n
  const remainder = ratio % (1n << 32n)
  const sqrtPriceX96 = ratioShifted + (remainder === 0n ? 0n : 1n)

  return sqrtPriceX96
}

/**
 * Calculates the greatest tick value such that getSqrtRatioAtTick(tick) <= sqrtPriceX96
 * @param sqrtPriceX96 The sqrt ratio as a Q64.96
 * @returns The greatest tick for which the ratio is less than or equal to the input ratio
 */
export function getTickAtSqrtRatio(sqrtPriceX96: bigint): number {
  if (sqrtPriceX96 < MIN_SQRT_RATIO || sqrtPriceX96 >= MAX_SQRT_RATIO) throw new Error('R')

  const ratio = sqrtPriceX96 << 32n

  let r = ratio
  let msb = 0n

  let f = r > 0xffffffffffffffffffffffffffffffffn ? 0x80n : 0n
  msb |= f
  r = f ? r >> 7n : r
  f = r > 0xffffffffffffffffn ? 0x40n : 0n
  msb |= f
  r = f ? r >> 6n : r
  f = r > 0xffffffffn ? 0x20n : 0n
  msb |= f
  r = f ? r >> 5n : r
  f = r > 0xffffn ? 0x10n : 0n
  msb |= f
  r = f ? r >> 4n : r
  f = r > 0xffn ? 0x8n : 0n
  msb |= f
  r = f ? r >> 3n : r
  f = r > 0xfn ? 0x4n : 0n
  msb |= f
  r = f ? r >> 2n : r
  f = r > 0x3n ? 0x2n : 0n
  msb |= f
  r = f ? r >> 1n : r
  f = r > 0x1n ? 1n : 0n
  msb |= f

  const msbNum = Number(msb)
  if (msbNum >= 128) r = ratio >> BigInt(msbNum - 127)
  else r = ratio << BigInt(127 - msbNum)

  let log2 = (BigInt(msbNum) - 128n) << 64n

  for (let i = 0; i < 14; i++) {
    r = (r * r) >> 127n
    const frac = r >> 128n
    log2 |= frac << BigInt(63 - i)
    r = r >> frac
  }

  const logSqrt10001 = log2 * 255738958999603826347141n
  const tickLow = Number(
    (logSqrt10001 - 3402992956809132418596140100660247210n) >> 128n
  )
  const tickHi = Number(
    (logSqrt10001 + 291339464771989622907027621153398088495n) >> 128n
  )

  const tick =
    tickLow === tickHi
      ? tickLow
      : getSqrtRatioAtTick(tickHi) <= sqrtPriceX96
        ? tickHi
        : tickLow

  return tick
}
