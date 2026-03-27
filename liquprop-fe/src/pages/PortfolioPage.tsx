import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useChainId } from 'wagmi'
import { TrendingUp, Wallet, Coins, BarChart3, RefreshCw, Zap, Info, Layers, ShoppingCart, Clock } from 'lucide-react'

import Header from '@/components/layout/Header'
import { PortfolioHoldingCard } from '@/components/property/PortfolioHoldingCard'
import { YieldChart } from '@/components/property/YieldChart'
import { getPortfolio, type Portfolio, type PortfolioHolding } from '@/lib/apicall/portfolio'
import { getYieldHistory, type YieldDistribution } from '@/lib/apicall/property'

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(4)}`
}

function unwrapArray<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[]
  const obj = r as Record<string, unknown>
  if (obj && Array.isArray(obj.data)) return obj.data as T[]
  return []
}

function groupHoldings(holdings: PortfolioHolding[]) {
  const live: PortfolioHolding[] = []
  const presale: PortfolioHolding[] = []
  const pending: PortfolioHolding[] = []

  for (const h of holdings) {
    if (h.propertyStatus === 'TOKEN_LIVE') live.push(h)
    else if (h.propertyStatus === 'LISTED' || h.propertyStatus === 'TOKENIZED') presale.push(h)
    else pending.push(h)
  }
  return { live, presale, pending }
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  holdings: PortfolioHolding[]
  onYieldClaimed: () => void
  accentClass: string
}

function HoldingsSection({ icon, title, subtitle, holdings, onYieldClaimed, accentClass }: SectionProps) {
  if (holdings.length === 0) return null
  return (
    <section className="space-y-3">
      <div className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 ${accentClass}`}>
        {icon}
        <div>
          <h2 className="font-heading text-base font-extrabold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="ml-auto rounded-full border border-current px-2 py-0.5 text-xs font-bold opacity-70">
          {holdings.length}
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {holdings.map((h) => (
          <PortfolioHoldingCard
            key={h.propertyId}
            holding={h}
            onYieldClaimed={onYieldClaimed}
          />
        ))}
      </div>
    </section>
  )
}

export default function PortfolioPage() {
  const { isConnected, status } = useAccount()
  const chainId = useChainId()
  const navigate = useNavigate()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allYield, setAllYield] = useState<YieldDistribution[]>([])
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const fetchPortfolio = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPortfolio(chainId.toString())
      const p = (data as any)?.data ?? data as Portfolio
      setPortfolio(p)
      setLastRefreshed(new Date())

      // Fetch yield history for TOKEN_LIVE holdings only
      const allDists: YieldDistribution[] = []
      for (const h of (p.holdings ?? []).filter((h: PortfolioHolding) => h.propertyStatus === 'TOKEN_LIVE')) {
        const yh = await getYieldHistory(h.propertyId).catch(() => [] as YieldDistribution[])
        allDists.push(...unwrapArray<YieldDistribution>(yh))
      }
      setAllYield(allDists.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) fetchPortfolio()
  }, [isConnected])

  if (!isConnected && (status === 'reconnecting' || status === 'connecting')) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!isConnected) return null

  const groups = portfolio ? groupHoldings(portfolio.holdings) : { live: [], presale: [], pending: [] }

  // Live-only stats for the summary bar
  const liveValue = groups.live.reduce((acc, h) => acc + h.currentValue, 0)
  const liveYield = groups.live.reduce((acc, h) => acc + h.pendingYield, 0)
  const presaleValue = groups.presale.reduce((acc, h) => acc + h.currentValue, 0)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10 space-y-8">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold">My Portfolio</h1>
            <p className="mt-1 text-muted-foreground">Your tokenized property holdings & yield.</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Synced every 45s
              </span>
            )}
            <button
              onClick={fetchPortfolio}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border-2 border-foreground/10 bg-muted" />
              ))}
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl border-2 border-foreground/10 bg-muted" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center">
            <p className="font-semibold text-red-600">{error}</p>
            <button onClick={fetchPortfolio} className="btn-candy mt-3 text-sm">
              Retry
            </button>
          </div>
        ) : !portfolio || portfolio.holdings.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-foreground/20 py-20 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground" strokeWidth={1} />
            <div>
              <p className="font-heading font-bold">No holdings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse the marketplace to invest in tokenized properties.
              </p>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="btn-candy flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" /> Go to Marketplace
            </button>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: 'Live Portfolio Value',
                  value: fmt(liveValue),
                  icon: <TrendingUp className="h-5 w-5" />,
                  color: 'text-primary',
                  bg: 'bg-primary/5 border-primary/20',
                },
                {
                  label: 'Presale Committed',
                  value: fmt(presaleValue),
                  icon: <ShoppingCart className="h-5 w-5" />,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50 border-blue-200',
                },
                {
                  label: 'Pending Yield',
                  value: fmt(liveYield),
                  icon: <Zap className="h-5 w-5" />,
                  color: 'text-violet-600',
                  bg: 'bg-violet-50 border-violet-200',
                },
                {
                  label: 'Claimed Yield',
                  value: fmt(portfolio.totalClaimedYield),
                  icon: <BarChart3 className="h-5 w-5" />,
                  color: 'text-pink-500',
                  bg: 'bg-pink-50 border-pink-200',
                },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} className={`rounded-2xl border-2 p-4 space-y-2 ${bg}`}>
                  <div className={`flex items-center gap-2 ${color}`}>
                    {icon}
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </span>
                  </div>
                  <p className={`font-heading text-2xl font-extrabold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* All token count */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="h-4 w-4" />
              <span>
                <span className="font-bold text-foreground">{portfolio.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>{' '}
                total tokens across{' '}
                <span className="font-bold text-foreground">{portfolio.holdings.length}</span>{' '}
                {portfolio.holdings.length === 1 ? 'property' : 'properties'}
              </span>
            </div>

            {/* Holdings sections */}
            <div className="space-y-8">
              <HoldingsSection
                icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                title="Live Investments"
                subtitle="Tokens trading on-market — price updates every 45s"
                holdings={groups.live}
                onYieldClaimed={fetchPortfolio}
                accentClass="border-emerald-200 bg-emerald-50 text-emerald-700"
              />

              <HoldingsSection
                icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
                title="In Presale"
                subtitle="Fundraise active — tokens unlock when sale closes"
                holdings={groups.presale}
                onYieldClaimed={fetchPortfolio}
                accentClass="border-blue-200 bg-blue-50 text-blue-700"
              />

              <HoldingsSection
                icon={<Clock className="h-5 w-5 text-muted-foreground" />}
                title="Awaiting Tokenization"
                subtitle="Properties preparing for token issuance"
                holdings={groups.pending}
                onYieldClaimed={fetchPortfolio}
                accentClass="border-foreground/10 bg-muted/30 text-muted-foreground"
              />

              {/* Empty state if all sections are empty (shouldn't happen since we check above) */}
              {groups.live.length === 0 && groups.presale.length === 0 && groups.pending.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-foreground/20 py-12 text-center">
                  <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
                  <p className="font-heading font-bold">No active holdings found</p>
                </div>
              )}
            </div>

            {/* Yield chart — TOKEN_LIVE only */}
            {allYield.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-heading text-xl font-extrabold">Yield History</h2>
                <div className="rounded-2xl border-2 border-foreground/10 bg-card p-5">
                  <YieldChart data={allYield} />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
