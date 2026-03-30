import { createWalletClient, http } from 'viem'
import { bscTestnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount(
  process.env.CHAINLINK_DEPLOYER_PK as `0x${string}`
)

const userAccount = privateKeyToAccount(
  process.env.JAMES_PRIVATE_KEY as `0x${string}`
)

const aliceAccount = privateKeyToAccount(
  process.env.ALICE_PRIVATE_KEY as `0x${string}`
)

const walletClient = createWalletClient({
  chain: bscTestnet,
  transport: http(process.env.BSC_TESTNET_RPC_URL as `https://${string}`),
  account,
})

export const userWalletClient = createWalletClient({
  chain: bscTestnet,
  transport: http(process.env.BSC_TESTNET_RPC_URL as `https://${string}`),
  account: userAccount,
})

export const aliceWalletClient = createWalletClient({
  chain: bscTestnet,
  transport: http(process.env.BSC_TESTNET_RPC_URL as `https://${string}`),
  account: aliceAccount,
})

export default walletClient
