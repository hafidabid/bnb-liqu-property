export interface MintPrincipleInput {
  totalSupply: number
  presaleAmount: number
  deadline: number
  tokenId: number
  presalePrice: number
}

export interface PresaleInput {
  tokenId: number
  amount: number
}

export interface DeployGuardInput {
  name: string
  symbol: string
  tokenId: number
  price: number
  floorPrice: number
}

export interface RouterInput {
  token0: `0x${string}`
  zeroForOne: boolean
  amountIn: number
  amountOut: number
  deadline: number
}
