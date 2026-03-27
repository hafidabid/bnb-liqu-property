export interface PortfolioHolding {
  propertyId: string
  tokenId: string
  propertyName: string
  propertyAddress: string
  propertyStatus: string
  balance: string // raw token units (18 dec)
  balanceFormatted: number // formatted tokens
  currentValue: number // USDC value = balance * currentPrice
  pendingYield: number // claimable yield in USDC
  claimedYield: number // already claimed yield in USDC
  currentPrice: number // USDC per token
}

export interface Portfolio {
  holdings: PortfolioHolding[]
  totalValue: number
  totalInvested: number
  totalPendingYield: number
  totalClaimedYield: number
}

export interface ClaimYieldTxInput {
  tokenId: string
}

export interface SubmitClaimYieldTxInput {
  tokenId: string
  tx: string
}
