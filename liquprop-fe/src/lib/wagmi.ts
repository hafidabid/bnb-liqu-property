import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { defineChain } from 'viem'
import type { Chain } from 'viem'
import type { ChainData } from './apicall/chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string

if (!projectId) {
  console.warn(
    '[wagmi] VITE_WALLETCONNECT_PROJECT_ID is not set. ' +
    'WalletConnect-based wallets will not work. ' +
    'Copy .env.example to .env and add your project ID.'
  )
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

/** Build a wagmi/RainbowKit config from chains fetched from the backend API. */
export function createWagmiConfig(apiChains: ChainData[]) {
  const viemChains = apiChains.map(c =>
    defineChain({
      id: c.chainId,
      name: c.name,
      nativeCurrency: {
        name: c.nativeCurrencyName,
        symbol: c.nativeCurrencySymbol,
        decimals: c.nativeCurrencyDecimals,
      },
      rpcUrls: {
        // Route all RPC traffic through the backend proxy to keep upstream URLs server-side
        default: { http: [`${API_BASE_URL}/v1/rpc/${c.chainId}`] },
      },
      blockExplorers: c.blockExplorerUrl
        ? { default: { name: c.blockExplorerName ?? 'Explorer', url: c.blockExplorerUrl } }
        : undefined,
      testnet: c.isTestnet,
    })
  ) as unknown as [Chain, ...Chain[]]

  return getDefaultConfig({
    appName: 'LiquProp',
    projectId: projectId ?? 'PLACEHOLDER',
    chains: viemChains,
    // http() with no arg uses the chain's default RPC URL (our backend proxy above)
    transports: Object.fromEntries(viemChains.map(c => [c.id, http()])),
    ssr: false,
  })
}
