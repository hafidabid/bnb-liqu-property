import {
  RainbowKitProvider,
  createAuthenticationAdapter,
  RainbowKitAuthenticationProvider,
  AuthenticationStatus
} from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import type { Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWagmiConfig } from '@/lib/wagmi'
import { getChains } from '@/lib/apicall/chains'
import { useEffect, useState, useMemo } from 'react'
import { SiweMessage } from 'siwe'
import { authService } from '@/lib/apicall/auth'

import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

interface Web3ProviderProps {
  children: React.ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [wagmiConfig, setWagmiConfig] = useState<Config | null>(null)
  const [chainsLoading, setChainsLoading] = useState(true)
  const [chainsError, setChainsError] = useState<string | null>(null)
  const [status, setStatus] = useState<AuthenticationStatus>('unauthenticated')

  // Restore auth state from storage on first render
  useEffect(() => {
    if (authService.isTokenValid()) {
      setStatus('authenticated')
    } else {
      // Clear stale/expired token so user gets a clean sign-in flow
      authService.clear()
      setStatus('unauthenticated')
    }
  }, [])

  // Fetch supported chains from the backend and build wagmi config
  useEffect(() => {
    getChains()
      .then(chains => {
        if (chains.length === 0) throw new Error('No active chains returned from API')
        setWagmiConfig(createWagmiConfig(chains))
      })
      .catch(err => {
        console.error('[Web3Provider] Failed to load chain config:', err)
        setChainsError('Unable to load blockchain configuration. Please try again later. : ' + err)
      })
      .finally(() => setChainsLoading(false))
  }, [])

  const authAdapter = useMemo(() => {
    if (!wagmiConfig) return null

    return createAuthenticationAdapter({
      getNonce: async () => {
        const { connections, current } = wagmiConfig.state
        const address = current ? connections.get(current)?.accounts[0] : undefined

        if (!address) {
          return '';
        }

        return await authService.getNonce(address)
      },

      createMessage: ({ nonce, address, chainId }) => {
        const message = new SiweMessage({
          domain: window.location.host,
          address,
          statement: 'Sign in with Ethereum to LiquProp',
          uri: window.location.origin,
          version: '1',
          chainId,
          nonce,
        })
        return message.prepareMessage()
      },

      verify: async ({ message, signature }) => {
        try {
          const { connections, current } = wagmiConfig.state
          const address = current ? connections.get(current)?.accounts[0] : undefined

          const verifyRes = await authService.verifySignature(
            address || '',
            message,
            signature
          )

          if (verifyRes.token) {
            authService.setToken(verifyRes.token)
            authService.setUser(verifyRes.user)
            setStatus('authenticated')
            return true
          }
          return false
        } catch (error) {
          console.error('Verification failed:', error)
          return false
        }
      },

      signOut: async () => {
        authService.clear()
        setStatus('unauthenticated')
      },
    })
  }, [wagmiConfig])

  if (chainsLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <p className="font-medium text-slate-600">Loading chain configuration…</p>
        </div>
      </div>
    )
  }

  if (chainsError || !wagmiConfig || !authAdapter) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm">
          <p className="font-semibold text-red-600">Configuration Error</p>
          <p className="text-sm text-slate-600">{chainsError ?? 'Failed to initialise blockchain provider.'}</p>
          <button
            className="btn-candy text-sm px-4 py-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitAuthenticationProvider
          adapter={authAdapter}
          status={status}
        >
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </RainbowKitAuthenticationProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
