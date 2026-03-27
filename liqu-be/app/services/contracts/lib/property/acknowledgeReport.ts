// Removed hardcoded CONTRACT_ADDRESSES
import PrincipleTokenABI from '../../abis/PrincipleTokenABI.js'
import publicClient from '../../client/publicClient.js'
import { encodeFunctionData, TransactionRequest } from 'viem'

export const createAcknowledgeReportTx = async (
  tokenId: bigint,
  userAddress: `0x${string}`,
  ptAddress: `0x${string}`
) => {
  const data = encodeFunctionData({
    abi: PrincipleTokenABI,
    functionName: 'acknowledgeReport',

    args: [tokenId] as any,
  })

  const [nonce, gas, feeData] = await Promise.all([
    publicClient.getTransactionCount({ address: userAddress }),
    publicClient.estimateGas({
      account: userAddress,
      to: ptAddress,
      data,
    }),
    publicClient.estimateFeesPerGas(),
  ])

  const tx: TransactionRequest = {
    to: ptAddress,
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

export const submitAcknowledgeReportTx = async (tx: `0x${string}`) => {
  const txHash = await publicClient.sendRawTransaction({
    serializedTransaction: tx,
  })

  return txHash
}
