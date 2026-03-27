import axiosInstance from '../axios'
import { cached, invalidateCache } from '../cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortfolioHolding {
  propertyId: string
  tokenId: string
  propertyName: string
  propertyAddress: string
  propertyStatus: string
  balance: string
  balanceFormatted: number
  currentValue: number
  pendingYield: number
  claimedYield: number
  currentPrice: number
}

export interface Portfolio {
  holdings: PortfolioHolding[]
  totalValue: number
  totalInvested: number
  totalPendingYield: number
  totalClaimedYield: number
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getPortfolio = (chainId: string): Promise<Portfolio> =>
  cached(`portfolio:${chainId}`, 30_000, () =>
    axiosInstance.get(`/v1/portfolio/${chainId}`).then(r => r.data ?? r))

export const createClaimYieldTx = (tokenId: string, chainId: string): Promise<Record<string, unknown>> =>
  axiosInstance.post(`/v1/portfolio/claim-yield/${chainId}/create-tx`, { tokenId }).then(r => r.data ?? r)

export const submitClaimYieldTx = async (tokenId: string, tx: string, chainId: string): Promise<{ txHash: string }> => {
  const result = await axiosInstance
    .post(`/v1/portfolio/claim-yield/${chainId}/submit`, { tokenId, tx })
    .then(r => r.data ?? r)
  // Invalidate frontend cache so next getPortfolio fetch reflects the claim
  invalidateCache('portfolio:')
  return result
}
