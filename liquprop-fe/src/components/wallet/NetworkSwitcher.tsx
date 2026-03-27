import { useAccount, useSwitchChain } from 'wagmi'
import { mainnet, sepolia, polygon, base } from 'wagmi/chains'
const SUPPORTED_CHAINS = [mainnet, sepolia, polygon, base]

export function NetworkSwitcher() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected) return null

  const currentChain = SUPPORTED_CHAINS.find((c) => c.id === chainId)

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground hidden sm:block">Network:</span>
      <select
        value={chainId ?? ''}
        disabled={isPending}
        onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Switch network"
      >
        {!currentChain && (
          <option value="" disabled>
            Unsupported
          </option>
        )}
        {SUPPORTED_CHAINS.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
    </div>
  )
}
