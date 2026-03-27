import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { Home, Building2, BarChart3, ShoppingBag, Wallet, ChevronDown, AlertTriangle, List, Zap, DollarSign } from 'lucide-react'
import { GasSettingsDialog } from '@/components/wallet/GasSettingsDialog'
import { USDCDialog } from '@/components/wallet/USDCDialog'
import { useGasPrice } from '@/hooks/useGasPrice'
import { useUSDCBalance } from '@/hooks/useUSDCBalance'

export default function Header() {
  const { isConnected } = useAccount()
  const [gasDialogOpen, setGasDialogOpen] = useState(false)
  const [usdcDialogOpen, setUsdcDialogOpen] = useState(false)
  const liveGwei = useGasPrice()
  const { formatted: usdcFormatted, isLoading: usdcLoading } = useUSDCBalance()

  return (
    <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-foreground bg-primary shadow-pop transition-all duration-200 ease-bouncy group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-pop-hover">
              <Home className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-xl font-extrabold tracking-tight">
              LiquProp
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/properties"
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
            >
              <Building2 className="h-3.5 w-3.5" strokeWidth={2.5} />
              Properties
            </Link>
            <Link
              to="/marketplace"
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
            >
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.5} />
              Marketplace
            </Link>
            {isConnected && (
              <>
                <Link
                  to="/portfolio"
                  className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
                >
                  <BarChart3 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Portfolio
                </Link>
                <Link
                  to="/my-properties"
                  className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
                >
                  <List className="h-3.5 w-3.5" strokeWidth={2.5} />
                  My Properties
                </Link>
              </>
            )}
          </nav>
        </div>

        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
            authenticationStatus,
          }) => {
            const ready = mounted && authenticationStatus !== 'loading'
            const connected = ready && account && chain &&
              (!authenticationStatus || authenticationStatus === 'authenticated')

            if (!ready) return null

            if (!connected) {
              return (
                <button
                  onClick={openConnectModal}
                  className="flex items-center gap-2 rounded-full border-2 border-foreground bg-primary px-4 py-2 text-sm font-bold text-white shadow-pop transition-all duration-200 ease-bouncy hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-active"
                >
                  <Wallet className="h-4 w-4" strokeWidth={2.5} />
                  {authenticationStatus === 'unauthenticated' ? 'Sign In' : 'Connect Wallet'}
                </button>
              )
            }

            if (chain.unsupported) {
              return (
                <button
                  onClick={openChainModal}
                  className="flex items-center gap-2 rounded-full border-2 border-foreground bg-destructive px-4 py-2 text-sm font-bold text-white shadow-pop transition-all duration-200 ease-bouncy hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-active"
                >
                  <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />
                  Wrong Network
                </button>
              )
            }

            return (
              <div className="flex items-center gap-2">
                {/* Gas Settings button */}
                <button
                  onClick={() => setGasDialogOpen(true)}
                  title="Gas Settings"
                  className="flex items-center gap-1.5 rounded-full border-2 border-foreground/30 bg-amber-400/10 px-2.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 shadow-sm transition-all duration-200 ease-bouncy hover:border-amber-400 hover:bg-amber-400/20 hover:-translate-y-0.5"
                >
                  <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {liveGwei ? (
                    <span className="hidden sm:inline font-mono">{liveGwei} Gwei</span>
                  ) : (
                    <span className="hidden sm:inline">Gas</span>
                  )}
                </button>

                {/* USDC Balance chip */}
                <button
                  onClick={() => setUsdcDialogOpen(true)}
                  title="USDC Balance"
                  className="flex items-center gap-1.5 rounded-full border-2 border-foreground/30 bg-emerald-400/10 px-2.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-sm transition-all duration-200 ease-bouncy hover:border-emerald-400 hover:bg-emerald-400/20 hover:-translate-y-0.5"
                >
                  <DollarSign className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {usdcLoading ? (
                    <span className="hidden sm:inline animate-pulse">…</span>
                  ) : (
                    <span className="hidden sm:inline font-mono">{usdcFormatted} USDC</span>
                  )}
                </button>

                {/* Chain selector */}
                <button
                  onClick={openChainModal}
                  className="flex items-center gap-1.5 rounded-full border-2 border-foreground bg-secondary px-3 py-2 text-sm font-bold text-white shadow-pop transition-all duration-200 ease-bouncy hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-active"
                >
                  <span className="hidden sm:inline">{chain.name}</span>
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>

                {/* Account button */}
                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-2 rounded-full border-2 border-foreground bg-primary px-4 py-2 text-sm font-bold text-white shadow-pop transition-all duration-200 ease-bouncy hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-active"
                >
                  {account.displayBalance && (
                    <span className="hidden text-xs font-semibold text-primary-foreground/80 sm:inline">
                      {account.displayBalance}
                    </span>
                  )}
                  <span>{account.displayName}</span>
                </button>
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>

      {/* Gas Settings Dialog */}
      {gasDialogOpen && <GasSettingsDialog onClose={() => setGasDialogOpen(false)} />}

      {/* USDC Dialog */}
      {usdcDialogOpen && <USDCDialog onClose={() => setUsdcDialogOpen(false)} />}
    </header>
  )
}
