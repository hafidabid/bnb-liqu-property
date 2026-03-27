import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useChainId } from 'wagmi'
import {
  TrendingUp,
  Building2,
  DollarSign,
  Wallet,
  ArrowUpRight,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  ExternalLink,
  Plus,
  ArrowLeftRight,
  Coins,
  ShieldCheck,
  FileText,
  Loader2,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { PropertyCard } from '@/components/property/PropertyCard'
import type { Property } from '@/components/property/PropertyCard'
import { listProperties, getRecentTransactions, type ApiProperty, type BlockchainTx } from '@/lib/apicall/property'
import { getPortfolio, type Portfolio } from '@/lib/apicall/portfolio'
import { getMarketStats } from '@/lib/apicall/market'


const STAT_META = [
  {
    key: 'totalInvested' as const,
    label: 'Total Invested',
    icon: DollarSign,
    color: 'bg-primary',
    shadow: 'shadow-pop-emerald',
  },
  {
    key: 'totalValue' as const,
    label: 'Current Value',
    icon: TrendingUp,
    color: 'bg-quaternary',
    shadow: 'shadow-pop',
  },
  {
    key: 'yieldEarned' as const,
    label: 'Yield Earned',
    icon: ArrowUpRight,
    color: 'bg-secondary',
    shadow: 'shadow-pop-pink',
  },
  {
    key: 'propertiesOwned' as const,
    label: 'Properties Owned',
    icon: Building2,
    color: 'bg-tertiary',
    shadow: 'shadow-pop-amber',
  },
]

function formatUSD(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function apiPropertyToCard(p: ApiProperty, chainId: string): Promise<Property> {
  let pricePerToken = 0
  let totalValue = 0
  const statsResult = p.tokenId ? await getMarketStats(p.tokenId, chainId).catch(() => null) : null

  if (statsResult) {
    pricePerToken = statsResult.currentPrice ?? 0
    totalValue = statsResult.tvl ?? 0
  }

  return {
    id: p.id,
    name: p.name,
    location: p.address,
    apy: 0,
    pricePerToken,
    totalValue,
    status: p.status === 'TOKEN_LIVE' ? 'token_live' : p.status === 'LISTED' ? 'listed' : p.status === 'TOKENIZED' ? 'tokenized' : 'coming-soon',
    thumbnailUrl: p.thumbnailDocument?.url,
  }
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const TX_META: Record<BlockchainTx['type'], { label: string; icon: React.ReactNode; color: string }> = {
  SWAP_TOKEN: { label: 'Swap', icon: <ArrowLeftRight className="h-3.5 w-3.5" />, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  DISTRIBUTE_YIELD: { label: 'Yield Distributed', icon: <Coins className="h-3.5 w-3.5" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  MINT_PRINCIPLE: { label: 'Tokens Minted', icon: <Coins className="h-3.5 w-3.5" />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  DEPLOY_GUARD: { label: 'Guard Deployed', icon: <ShieldCheck className="h-3.5 w-3.5" />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  REGISTER_PROPERTY: { label: 'Property Listed', icon: <FileText className="h-3.5 w-3.5" />, color: 'text-pink-600 bg-pink-50 border-pink-200' },
}

const STATUS_META: Record<BlockchainTx['status'], { label: string; color: string }> = {
  CONFIRMED: { label: 'Confirmed', color: 'text-emerald-700 bg-emerald-50' },
  PENDING: { label: 'Pending', color: 'text-amber-700 bg-amber-50' },
  FAILED: { label: 'Failed', color: 'text-red-700 bg-red-50' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function shortHash(hash: string) {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

export default function DashboardPage() {
  const { isConnected, address, status } = useAccount()
  const navigate = useNavigate()
  const chainId = useChainId()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [portfolioLoading, setPortfolioLoading] = useState(true)
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [recentTxs, setRecentTxs] = useState<BlockchainTx[]>([])
  const [txLoading, setTxLoading] = useState(true)

  // Handled by ProtectedRoute component

  useEffect(() => {
    if (!isConnected) return
    setPortfolioLoading(true)
    getPortfolio(chainId.toString())
      .then((r) => setPortfolio(r))
      .catch(() => setPortfolio(null))
      .finally(() => setPortfolioLoading(false))
  }, [isConnected, chainId])

  useEffect(() => {
    if (!isConnected) return
    listProperties(1, 6)
      .then(async (res) => {
        const items: ApiProperty[] = Array.isArray(res) ? res : res?.data ?? []
        const cards = await Promise.all(items.map((p) => apiPropertyToCard(p, chainId.toString())))
        setAvailableProperties(cards)
      })
      .catch(() => {/* keep empty on error */ })
  }, [isConnected, chainId])

  useEffect(() => {
    if (!isConnected) return
    setTxLoading(true)
    getRecentTransactions(15)
      .then((txs) => setRecentTxs(Array.isArray(txs) ? txs : []))
      .catch(() => setRecentTxs([]))
      .finally(() => setTxLoading(false))
  }, [isConnected])

  // Show spinner while wallet auto-reconnects (JWT is valid, just waiting on wagmi)
  if (!isConnected && (status === 'reconnecting' || status === 'connecting')) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!isConnected) return null

  const yieldEarned = portfolio ? (portfolio.totalPendingYield + portfolio.totalClaimedYield) : 0
  const propertiesOwned = portfolio?.holdings?.length ?? 0

  const statValues: Record<string, string> = {
    totalInvested: portfolioLoading ? '—' : formatUSD(portfolio?.totalInvested ?? 0),
    totalValue: portfolioLoading ? '—' : formatUSD(portfolio?.totalValue ?? 0),
    yieldEarned: portfolioLoading ? '—' : formatUSD(yieldEarned),
    propertiesOwned: portfolioLoading ? '—' : propertiesOwned.toString(),
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-10 space-y-10">
        {/* ─── WELCOME BANNER ───────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-foreground bg-primary p-8 shadow-pop-emerald">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white opacity-5" />
          <div className="pointer-events-none absolute -bottom-8 right-12 h-32 w-32 rounded-full bg-secondary opacity-20" />
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-10" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
                <CheckCircle2 className="h-4 w-4 text-quaternary" strokeWidth={2.5} />
                Wallet Connected · SIWE Authenticated
              </div>
              <h1 className="font-heading text-3xl font-extrabold text-white">
                Welcome back!
              </h1>
              <p className="font-mono text-sm text-white/60">
                {address ? truncateAddress(address) : ''}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <button
                onClick={() => navigate('/list-property')}
                className="btn-candy flex items-center justify-center gap-2 px-6 py-2.5 font-heading text-sm font-extrabold"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />Publish and Tokenize your Property
              </button>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border-2 border-white/20 bg-white/10 px-5 py-3 text-center backdrop-blur">
                  <div className="font-heading text-2xl font-extrabold text-white">
                    {portfolioLoading ? '—' : formatUSD(portfolio?.totalValue ?? 0)}
                  </div>
                  <div className="text-xs text-white/70">Portfolio Value</div>
                </div>
                <div className="rounded-xl border-2 border-white/20 bg-white/10 px-5 py-3 text-center backdrop-blur">
                  <div className="font-heading text-2xl font-extrabold text-tertiary">—</div>
                  <div className="text-xs text-white/70">Avg APY</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── PORTFOLIO STATS ──────────────────────────────── */}
        <div>
          <div className="mb-5 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" strokeWidth={2.5} />
            <h2 className="font-heading text-xl font-bold">Portfolio Overview</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STAT_META.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className={`rounded-2xl border-2 border-foreground bg-card p-5 ${stat.shadow} transition-all duration-200 ease-bouncy hover:-translate-y-0.5 hover:scale-[1.01]`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground ${stat.color}`}>
                      <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <div className="font-heading text-2xl font-extrabold">
                    {portfolioLoading ? (
                      <div className="h-7 w-24 animate-pulse rounded-lg bg-muted" />
                    ) : (
                      statValues[stat.key]
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── MY INVESTMENTS + RECENT ACTIVITY ─────────────── */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* My investments */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" strokeWidth={2.5} />
                <h2 className="font-heading text-xl font-bold">My Investments</h2>
              </div>
              <button className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {availableProperties.slice(0, 2).map((p) => (
                <PropertyCard key={p.id} property={p} onClick={() => navigate(`/property/${p.id}`)} />
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" strokeWidth={2.5} />
              <h2 className="font-heading text-xl font-bold">Recent Activity</h2>
            </div>

            {txLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentTxs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-foreground/20 py-12 text-center">
                <Clock className="h-8 w-8 text-muted-foreground" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">No transactions yet.</p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-foreground/10 bg-card divide-y divide-foreground/5 max-h-[380px] overflow-auto">
                {recentTxs.map((tx) => {
                  const meta = TX_META[tx.type] ?? TX_META.REGISTER_PROPERTY
                  const statusMeta = STATUS_META[tx.status] ?? STATUS_META.PENDING
                  const explorerUrl = tx.chain?.blockExplorerUrl
                    ? `${tx.chain.blockExplorerUrl}/tx/${tx.txHash}`
                    : null
                  return (
                    <div key={tx.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      {/* Type badge */}
                      <span className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
                        {meta.icon}
                        {meta.label}
                      </span>

                      {/* Property + hash */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground leading-tight">
                          {tx.property?.name ?? 'Unknown Property'}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground leading-tight mt-0.5">
                          {tx.property?.address ?? ''}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusMeta.color}`}>
                            {statusMeta.label}
                          </span>
                          {explorerUrl ? (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground hover:text-primary"
                            >
                              {shortHash(tx.txHash)}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {shortHash(tx.txHash)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Time */}
                      <span className="shrink-0 text-[10px] text-muted-foreground mt-0.5">
                        {timeAgo(tx.createdAt)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── AVAILABLE PROPERTIES ─────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={2.5} />
              <h2 className="font-heading text-xl font-bold">Available Properties</h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Browse all <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {availableProperties.length > 0
              ? availableProperties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onClick={() => navigate(`/property/${p.id}`)}
                />
              ))
              : (
                <div className="col-span-full flex h-36 items-center justify-center rounded-2xl border-2 border-dashed border-foreground/20 text-sm text-muted-foreground">
                  No properties listed yet.
                </div>
              )}
          </div>
        </div>

        {/* ─── AI INSIGHT BANNER ────────────────────────────── */}
        <div className="rounded-2xl border-2 border-foreground bg-primary p-6 shadow-pop-amber">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-white">
                <Sparkles className="h-5 w-5 text-black" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-heading font-bold">AI Market Insight</div>
                <p className="mt-0.5 text-sm text-foreground/80">
                  Based on satellite analysis and Chainlink data, properties in Miami and SF show
                  a predicted 8–14% appreciation over the next 12 months. Your portfolio is
                  optimally positioned.
                </p>
              </div>
            </div>
            <button className="btn-outline-pop shrink-0 text-sm">
              View Full Report
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </main>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <footer className="mt-10 border-t-2 border-foreground bg-background py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-heading text-lg font-extrabold">LiquProp</span>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} LiquProp. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
