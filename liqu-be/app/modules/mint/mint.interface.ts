export interface MintPrincipleInput {
  propertyId: string
  from: `0x${string}`
  totalSupply: number
  presaleAmount: number
  deadline: number
  tokenId: number
  presalePrice: number
}

export interface ApproveMintPrincipleInput {
  tokenId: number
  from: `0x${string}`
}

export interface SubmitMintPrincipleInput {
  propertyId: string
  txHash: `0x${string}`
}
