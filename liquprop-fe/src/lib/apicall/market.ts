import axiosInstance from '../axios'
import { cached } from '../cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarketStats {
  tokenId: string
  currentPrice: number
  baselinePrice: number
  tvl: number
  liquidity: number
  totalYieldDistributed: number
  holderYieldTotal: number
  baselineYieldTotal: number
  platformFeeTotal: number
}

export interface PricePoint {
  date: string
  tokenPrice: string | number
  baselinePrice: string | number
}

export type PriceRange = '1m' | '5m' | '30m' | '1h' | '12h' | '1d' | '1w' | '1mo' | 'all'

// ─── Cache TTL by range ───────────────────────────────────────────────────────
// Short ranges need fresh data; long ranges can tolerate a longer cache.
const RANGE_TTL: Record<PriceRange, number> = {
  '1m':  10_000,
  '5m':  15_000,
  '30m': 30_000,
  '1h':  30_000,
  '12h': 60_000,
  '1d':  60_000,
  '1w':  120_000,
  '1mo': 120_000,
  'all': 120_000,
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getMarketStats = (tokenId: string, chainId: string): Promise<MarketStats> =>
  cached(`market:stats:${chainId}:${tokenId}`, 60_000, () =>
    axiosInstance.get(`/v1/market/${tokenId}/${chainId}/stats`).then(r => r.data ?? r))

export const getPriceHistory = (tokenId: string, chainId: string, range: PriceRange = 'all'): Promise<PricePoint[]> =>
  cached(`market:price:${chainId}:${tokenId}:${range}`, RANGE_TTL[range], () =>
    axiosInstance
      .get(`/v1/market/${tokenId}/${chainId}/price-history`, { params: { range } })
      .then(r => r.data ?? r))
