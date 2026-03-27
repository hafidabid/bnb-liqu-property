export interface MarketStats {
  tokenId: string
  currentPrice: number // USDC per token
  baselinePrice: number // floor price in USDC
  tvl: number // total value locked in USDC
  liquidity: number // available liquidity in USDC
  totalYieldDistributed: number
  holderYieldTotal: number
  baselineYieldTotal: number
  platformFeeTotal: number
}

export interface PricePoint {
  date: string // ISO date string
  tokenPrice: string // USDC per token — string to preserve full Decimal precision
  baselinePrice: string // floor USDC per token — string to preserve full Decimal precision
}

export interface GetMarketStatsParams {
  tokenId: string
}

export interface GetPriceHistoryParams {
  tokenId: string
}
