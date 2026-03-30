// Removed hardcoded CONTRACT_ADDRESSES
import MockUSDCABI from '../../abis/MockUSDCABI.js'
import walletClient from '../../client/walletClient.js'
import { bscTestnet } from 'viem/chains'

export const dealUSDC = async (amount: bigint, to: `0x${string}`, usdcAddress: `0x${string}`) => {
  const tx = await walletClient.writeContract({
    chain: bscTestnet,
    account: walletClient.account,
    address: usdcAddress,
    abi: MockUSDCABI,
    functionName: 'mint',
    args: [to, amount * 10n ** 6n],
  })

  return tx
}
