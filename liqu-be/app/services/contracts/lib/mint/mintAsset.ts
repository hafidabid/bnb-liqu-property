// Removed hardcoded CONTRACT_ADDRESSES
import PrincipleTokenABI from '../../abis/PrincipleTokenABI.js'
import walletClient from '../../client/walletClient.js'
import publicClient from '../../client/publicClient.js'
import { baseSepolia } from 'viem/chains'

const mintAsset = async (to: `0x${string}`, ptAddress: `0x${string}`) => {
  const account = walletClient.account!
  const nonce = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: 'latest',
  })

  const tx = await walletClient.writeContract({
    chain: baseSepolia,
    account,
    address: ptAddress,
    abi: PrincipleTokenABI,
    functionName: 'mintAsset',
    args: [to],
    nonce: nonce,
  })

  return tx
}

/** Returns the next asset token id (the id that will be assigned on next mint). */
export const getNextAssetTokenId = async (ptAddress: `0x${string}`): Promise<number> => {
  const id = await publicClient.readContract({
    address: ptAddress,
    abi: PrincipleTokenABI,
    functionName: 'tokenId',
  } as unknown as Parameters<typeof publicClient.readContract>[0])

  return Number(id) + 1
}

export default mintAsset
