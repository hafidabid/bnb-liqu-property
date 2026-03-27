import PrincipleRouterABI from '../../abis/PrincipleRouterABI.js'
import { RouterInput } from '../interface.js'
import publicClient from '../../client/publicClient.js'
import { encodeFunctionData, TransactionRequest } from 'viem'

export const createSwapTx = async (
  input: RouterInput,
  userAddress: `0x${string}`,
  routerAddress: `0x${string}`
) => {
  const { token0, zeroForOne, amountIn, amountOut, deadline } = input
  const data = encodeFunctionData({
    abi: PrincipleRouterABI,
    functionName: 'swap',
    args: [{ token0, zeroForOne, amountIn, amountOut, deadline }],
  })
  const [nonce, gas, feeData] = await Promise.all([
    publicClient.getTransactionCount({ address: userAddress }),
    publicClient.estimateGas({
      account: userAddress,
      to: routerAddress,
      data,
    }),
    publicClient.estimateFeesPerGas(),
  ])
  const tx: TransactionRequest = {
    to: routerAddress,
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

export const submitSwapTx = async (tx: `0x${string}`) => {
  const txHash = await publicClient.sendRawTransaction({
    serializedTransaction: tx,
  })

  return txHash
}
