import { getTickAtSqrtRatio, getSqrtRatioAtTick } from './TickMath.js'
import { priceToSqrtPriceX96 } from './PriceMath.js'
import { encodeFunctionData, TransactionRequest } from 'viem'
// Removed hardcoded CONTRACT_ADDRESSES
import PrincipleTokenABI from '../../abis/PrincipleTokenABI.js'
import publicClient from '../../client/publicClient.js'
import { DeployGuardInput } from '../interface.js'

/** Matches Solidity: PriceMath.priceToSqrtPriceX96(0.9e6, 18) → getTickAtSqrtRatio → -277320 */
const FLOOR_TICK_09E6 = -277320

export const createDeployGuardTx = async (
  input: DeployGuardInput,
  userAddress: `0x${string}`,
  ptAddress: `0x${string}`
) => {
  const { name, symbol, tokenId, price, floorPrice } = input
  const sqrtPriceX96 = priceToSqrtPriceX96(BigInt(price), 18)
  const floorPriceNum = Number(floorPrice)
  const floorSqrtPriceX96 =
    floorPriceNum === 0.9e6 || floorPriceNum === 900_000
      ? getSqrtRatioAtTick(FLOOR_TICK_09E6)
      : priceToSqrtPriceX96(BigInt(floorPrice), 18)
  let floorTick = getTickAtSqrtRatio(floorSqrtPriceX96)
  floorTick = FLOOR_TICK_09E6
  const data = encodeFunctionData({
    abi: PrincipleTokenABI,
    functionName: 'deployGuard',

    args: [name, symbol, BigInt(tokenId), sqrtPriceX96, floorTick] as any,
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
    data: data,
    nonce: nonce,
    gas: gas,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    type: 'eip1559',
  }

  return tx
}

export const submitDeployGuardTx = async (tx: `0x${string}`) => {
  const txHash = await publicClient.sendRawTransaction({
    serializedTransaction: tx,
  })

  return txHash
}
