import { createPublicClient, http } from 'viem'
import { bscTestnet } from 'viem/chains'

const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(process.env.BSC_TESTNET_RPC_URL),
})

export default publicClient
