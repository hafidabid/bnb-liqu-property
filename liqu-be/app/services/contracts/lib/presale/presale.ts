// Removed hardcoded CONTRACT_ADDRESSES
import PrincipleTokenABI from '../../abis/PrincipleTokenABI.js'
import publicClient from '../../client/publicClient.js'
import { encodeFunctionData, TransactionRequest } from 'viem'
import { PresaleInput } from '../interface.js'
import MockUSDCABI from '../../abis/MockUSDCABI.js'
import {
  userWalletClient,
  aliceWalletClient,
} from '../../client/walletClient.js'
import { bscTestnet } from 'viem/chains'

export const createPresaleTx = async (
  input: PresaleInput,
  userAddress: `0x${string}`,
  ptAddress: `0x${string}`
) => {
  const { tokenId, amount } = input
  const data = encodeFunctionData({
    abi: PrincipleTokenABI,
    functionName: 'buyPresale',

    args: [BigInt(tokenId), BigInt(amount)] as any,
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

export const submitPresaleTx = async (tx: `0x${string}`) => {
  const txHash = await publicClient.sendRawTransaction({
    serializedTransaction: tx,
  })

  return txHash
}

export const approveUSDCPresale = async (amount: number, assetAddress: `0x${string}`, usdcAddress: `0x${string}`) => {
  const to = assetAddress
  const tx = await userWalletClient.writeContract({
    chain: bscTestnet,
    account: userWalletClient.account,
    address: usdcAddress,
    abi: MockUSDCABI,
    functionName: 'approve',
    args: [to, amount],
  })

  return tx
}

/** For testing: buyer (alice) approves USDC to CH_PT for buyPresale */
export const approveUSDCForBuyer = async (amount: number, ptAddress: `0x${string}`, usdcAddress: `0x${string}`) => {
  const spender = ptAddress
  const tx = await aliceWalletClient.writeContract({
    chain: bscTestnet,
    account: aliceWalletClient.account,
    address: usdcAddress,
    abi: MockUSDCABI,
    functionName: 'approve',
    args: [spender, amount],
  })

  return tx
}
