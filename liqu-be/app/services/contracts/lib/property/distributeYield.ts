import { Prisma } from '@prisma/client'
import publicClient from '../../client/publicClient.js'
import { encodeFunctionData, TransactionRequest } from 'viem'

export const createDistributeYieldTx = async (
  tokenId: bigint,
  amount: bigint,
  userAddress: `0x${string}`,
  contract: Prisma.ContractGetPayload<{
    include: {
      chain: true
    }
  }>
) => {
  const data = encodeFunctionData({
    abi: contract.abi as any,
    functionName: 'distributeYield',

    args: [tokenId, amount] as any,
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
    data,
    nonce,
    gas,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    type: 'eip1559',
  }

  return tx
}

export const submitDistributeYieldTx = async (tx: `0x${string}`) => {
  const txHash = await publicClient.sendRawTransaction({
    serializedTransaction: tx,
  })

  return txHash
}
