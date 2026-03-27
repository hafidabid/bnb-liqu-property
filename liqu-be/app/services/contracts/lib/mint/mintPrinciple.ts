// Removed hardcoded CONTRACT_ADDRESSES
import PrincipleTokenABI from '../../abis/PrincipleTokenABI.js'
import publicClient from '../../client/publicClient.js'
import { encodeFunctionData, TransactionRequest } from 'viem'
import { MintPrincipleInput } from '../interface.js'
import PrincipleAssetABI from '../../abis/PrincipleAssetABI.js'
import { userWalletClient } from '../../client/walletClient.js'
import { baseSepolia } from 'viem/chains'
import { Prisma } from '@prisma/client'

export const createMintPrincipleTx = async (
  input: MintPrincipleInput,
  sla: any,
  subscription: any,
  userAddress: `0x${string}`,
  contract: Prisma.ContractGetPayload<{ include: { chain: true } }>
) => {
  const { totalSupply, presaleAmount, deadline, tokenId, presalePrice } = input

  // SubscriptionPlan: YIELD_PERCENTAGE = 0, MONTHLY = 1
  const feeType = subscription.plan === 'YIELD_PERCENTAGE' ? 0 : 1

  // Map 10 fields for PositionInput
  const positionInput = {
    totalSupply: BigInt(totalSupply),
    presaleAmount: BigInt(presaleAmount),
    deadline: BigInt(deadline),
    tokenId: BigInt(tokenId),
    presalePrice: BigInt(presalePrice),
    holderYieldBPS: BigInt(sla.holderYieldBPS),
    baselineYieldBPS: BigInt(sla.baselineYieldBPS),
    yieldPeriodSeconds: BigInt(sla.yieldPeriodDays * 24 * 60 * 60),
    reportPeriodSeconds: BigInt(sla.reportPeriodDays * 24 * 60 * 60),
    feeType
  }

  const data = encodeFunctionData({
    abi: contract.abi as any,
    functionName: 'mintPrinciple',
    args: [positionInput] as any,
  })

  const [nonce, gas, feeData] = await Promise.all([
    publicClient.getTransactionCount({ address: userAddress }),
    publicClient.estimateGas({
      account: userAddress,
      to: contract.address as `0x${string}`,
      data,
    }),
    publicClient.estimateFeesPerGas(),
  ])

  const tx: TransactionRequest = {
    to: contract.address as `0x${string}`,
    from: userAddress,
    data: data,
    nonce: nonce,
    gas: gas,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    type: 'eip1559',
  }

  return tx
}

export const createApproveMintPrincipleTx = async (
  tokenId: number,
  userAddress: `0x${string}`,
  principleAssetContract: Prisma.ContractGetPayload<{ include: { chain: true } }>,
  principleTokenContract: Prisma.ContractGetPayload<{ include: { chain: true } }>
) => {
  const data = encodeFunctionData({
    abi: principleAssetContract.abi as any,
    functionName: 'approve',
    args: [principleTokenContract.address as `0x${string}`, BigInt(tokenId)],
  })

  const [nonce, gas, feeData] = await Promise.all([
    publicClient.getTransactionCount({ address: userAddress }),
    publicClient.estimateGas({
      account: userAddress,
      to: principleAssetContract.address as `0x${string}`,
      data,
    }),
    publicClient.estimateFeesPerGas(),
  ])

  const tx: TransactionRequest = {
    to: principleAssetContract.address as `0x${string}`,
    from: userAddress,
    data: data,
    nonce: nonce,
    gas: gas,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    type: 'eip1559',
  }

  return tx
}

// Removed submitMintPrincipleTx as it's handled by the controller

//TESTING FUNCTIONS
export const approveMintPrinciple = async (tokenId: number, ptAddress: `0x${string}`, assetAddress: `0x${string}`) => {
  const to = ptAddress
  const tx = await userWalletClient.writeContract({
    chain: baseSepolia,
    account: userWalletClient.account,
    address: assetAddress,
    abi: PrincipleAssetABI,
    functionName: 'approve',
    args: [to, tokenId],
  })

  return tx
}

export const ptTokenId = async (ptAddress: `0x${string}`): Promise<bigint> => {

  const tokenId = await (publicClient.readContract as any)({
    address: ptAddress,
    abi: PrincipleTokenABI,
    functionName: 'tokenId',
  }) as bigint

  return tokenId
}
