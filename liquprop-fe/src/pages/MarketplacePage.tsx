import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChainId, useReadContracts } from 'wagmi'
import { ShoppingCart, MapPin, Sparkles, BarChart2, ImageOff, Calendar, Percent, TrendingUp, Zap, ArrowUpRight, Clock, Search } from 'lucide-react'

import Header from '@/components/layout/Header'
import { PropertyStatusBadge } from '@/components/property/PropertyStatusBadge'
import { TokenSaleProgress } from '@/components/property/TokenSaleProgress'
import { PresaleMiniInfo, PresalePanel } from '@/components/property/PresalePanel'
import { listProperties, type ApiProperty } from '@/lib/apicall/property'
import { getMarketStats, type MarketStats } from '@/lib/apicall/market'
import { loadContractAddresses } from '@/lib/apicall/chains'
import { PrincipleTokenABI } from '@/lib/abis/PrincipleTokenABI'

// Marketplace only shows investable statuses
const INVESTABLE_STATUSES = ['TOKENIZED', 'LISTED', 'TOKEN_LIVE']

function unwrapArray<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[]
  const obj = r as Record<string, unknown>
  if (obj && Array.isArray(obj.data)) return obj.data as T[]
  return []
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function getSaleStatus(start?: string, end?: string): { label: string; color: string } {
  if (!start || !end) return { label: 'TBA', color: 'text-muted-foreground bg-muted' }
  const now = Date.now()
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (now < s) return { label: 'Upcoming', color: 'text-blue-700 bg-blue-50 border-blue-200' }
  if (now <= e) return { label: 'Sale Live', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
  return { label: 'Sale Ended', color: 'text-gray-600 bg-gray-100 border-gray-200' }
}

function shortDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MarketplacePage() {
  const navigate = useNavigate()
  const chainId = useChainId()

  const [properties, setProperties] = useState<ApiProperty[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, MarketStats>>({})
  const [loading, setLoading] = useState(true)
  const [ptAddress, setPtAddress] = useState<`0x${string}` | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'tvl' | 'yield' | 'price' | 'newest'>('newest')

  useEffect(() => {
    loadContractAddresses(chainId)
      .then((c) => setPtAddress(c['CH_PT'] as `0x${string}`))
      .catch(() => {})
  }, [chainId])

  useEffect(() => {
    setLoading(true)
    listProperties(1, 50)
      .then(async (res) => {
        const all = unwrapArray<ApiProperty>(res)
        // Only show investable statuses
        const investable = all.filter((p) => INVESTABLE_STATUSES.includes(p.status))
        setProperties(investable)

        // Fetch market stats for tokenized properties
        const withToken = investable.filter((p) => (p as any).tokenId)
        for (let i = 0; i < withToken.length; i += 3) {
          await Promise.allSettled(
            withToken.slice(i, i + 3).map((p) =>
              getMarketStats((p as any).tokenId, chainId.toString())
                .then((stats) => setStatsMap((prev) => ({ ...prev, [p.id]: stats })))
                .catch(() => {})
            )
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Batch-read on-chain position data for presale info
  const tokenizedProps = properties.filter((p) => (p as any).tokenId && ptAddress)
  const { data: positionsRaw } = useReadContracts({
    contracts: tokenizedProps.map((p) => ({
      address: ptAddress as `0x${string}`,
      abi: PrincipleTokenABI,
      functionName: 'getIdToPosition',
      args: [BigInt((p as any).tokenId)],
    })),
    query: { enabled: !!ptAddress && tokenizedProps.length > 0 },
  })
  const positionsMap = useMemo(() => {
    const map: Record<string, any> = {}
    if (!positionsRaw) return map
    tokenizedProps.forEach((p, i) => {
      const item = positionsRaw[i]
      if (item?.status === 'success' && item.result) map[p.id] = item.result
    })
    return map
  }, [positionsRaw, tokenizedProps.map((p) => p.id).join(',')])

  // Aggregate stats for hero banner
  const totalTVL = Object.values(statsMap).reduce((acc, s) => acc + s.tvl, 0)
  const totalYield = Object.values(statsMap).reduce((acc, s) => acc + s.totalYieldDistributed, 0)

  // Featured = TOKEN_LIVE with highest TVL
  const liveSorted = properties
    .filter((p) => p.status === 'TOKEN_LIVE')
    .sort((a, b) => (statsMap[b.id]?.tvl ?? 0) - (statsMap[a.id]?.tvl ?? 0))
  const featured = liveSorted[0] ?? null
  const featuredStats = featured ? statsMap[featured.id] : null

  const filtered = useMemo(() => {
    let result = properties.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
    )
    if (sortBy === 'tvl') result = [...result].sort((a, b) => (statsMap[b.id]?.tvl ?? 0) - (statsMap[a.id]?.tvl ?? 0))
    else if (sortBy === 'yield') result = [...result].sort((a, b) => (statsMap[b.id]?.totalYieldDistributed ?? 0) - (statsMap[a.id]?.totalYieldDistributed ?? 0))
    else if (sortBy === 'price') result = [...result].sort((a, b) => (statsMap[b.id]?.currentPrice ?? 0) - (statsMap[a.id]?.currentPrice ?? 0))
    else result = [...result].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    return result
  }, [properties, search, sortBy, statsMap])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="space-y-12 pb-16">

        {/* Hero Banner */}
        <section className="bg-foreground text-background py-16">
          <div className="container space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                Tokenized Real Estate
              </span>
            </div>
            <h1 className="font-heading text-5xl font-extrabold leading-tight">
              Invest in Real Estate.
              <br />
              <span className="text-primary">On-Chain.</span>
            </h1>
            <p className="max-w-xl text-lg text-background/70">
              Buy fractional tokens in verified properties. Earn yield backed by real leases. Protected by baseline price floors on Uniswap V3.
            </p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div>
                <p className="text-3xl font-heading font-extrabold text-primary">{fmt(totalTVL)}</p>
                <p className="text-sm text-background/60">Total Market TVL</p>
              </div>
              <div>
                <p className="text-3xl font-heading font-extrabold text-primary">{properties.length}</p>
                <p className="text-sm text-background/60">Investable Properties</p>
              </div>
              <div>
                <p className="text-3xl font-heading font-extrabold text-primary">{fmt(totalYield)}</p>
                <p className="text-sm text-background/60">Total Yield Distributed</p>
              </div>
            </div>
          </div>
        </section>

        <div className="container space-y-12">

          {/* Featured Property (TOKEN_LIVE with highest TVL) */}
          {featured && featuredStats && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live Trading
                </span>
                <h2 className="font-heading text-2xl font-extrabold">Featured Property</h2>
              </div>
              <div className="rounded-2xl border-2 border-foreground bg-card shadow-pop-amber overflow-hidden">
                {featured.thumbnailDocument?.url ? (
                  <img src={featured.thumbnailDocument.url} alt={featured.name} className="h-64 w-full object-cover" />
                ) : (
                  <div className="flex h-64 w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
                    <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                    <span className="text-sm">No Image</span>
                  </div>
                )}

                <div className="px-6 pb-6 space-y-5 pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-2xl font-extrabold">{featured.name}</h3>
                        <PropertyStatusBadge status={featured.status} />
                      </div>
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-4 w-4" /> {featured.address}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/property/${featured.id}`)}
                        className="btn-candy flex items-center gap-2"
                      >
                        <ArrowUpRight className="h-4 w-4" /> Trade Now
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Token Price', value: fmt(featuredStats.currentPrice), color: 'text-primary', icon: <TrendingUp className="h-4 w-4" /> },
                      { label: 'Baseline Floor', value: fmt(featuredStats.baselinePrice), color: 'text-violet-600', icon: <BarChart2 className="h-4 w-4" /> },
                      { label: 'TVL', value: fmt(featuredStats.tvl), color: 'text-amber-600', icon: <Zap className="h-4 w-4" /> },
                      { label: 'Yield Distributed', value: fmt(featuredStats.totalYieldDistributed), color: 'text-pink-500', icon: <Percent className="h-4 w-4" /> },
                    ].map(({ label, value, color, icon }) => (
                      <div key={label} className="rounded-xl border border-foreground/10 bg-background p-3">
                        <div className={`flex items-center gap-1 ${color} mb-1`}>{icon}<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p></div>
                        <p className={`font-heading text-lg font-extrabold ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {positionsMap[featured.id] ? (
                    <PresalePanel positionData={positionsMap[featured.id]} />
                  ) : featured.targetFundUSD ? (
                    <TokenSaleProgress bought={featuredStats.tvl} target={featured.targetFundUSD} label="Presale Progress" />
                  ) : null}
                </div>
              </div>
            </section>
          )}

          {/* Search + Sort */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search properties…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border-2 border-foreground/20 bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-xl border-2 border-foreground/20 bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="tvl">Highest TVL</option>
              <option value="yield">Most Yield</option>
              <option value="price">Highest Price</option>
            </select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filtered.length} {filtered.length === 1 ? 'property' : 'properties'}
            </span>
          </div>

          {/* Property Grid */}
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-60 animate-pulse rounded-2xl border-2 border-foreground/10 bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-foreground/20 py-20 text-center">
              <BarChart2 className="h-12 w-12 text-muted-foreground" strokeWidth={1} />
              <p className="font-heading font-bold">No properties found</p>
              <p className="text-sm text-muted-foreground">Try a different search.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const stats = statsMap[p.id]
                const sale = getSaleStatus(p.salePeriodStart, p.salePeriodEnd)
                const holderYield = p.sla ? (p.sla.holderYieldBPS / 100).toFixed(1) : null
                const isLive = p.status === 'TOKEN_LIVE'
                const isPresale = p.status === 'LISTED'

                return (
                  <div
                    key={p.id}
                    className="group rounded-2xl border-2 border-foreground bg-card shadow-pop overflow-hidden"
                  >
                    {/* Thumbnail */}
                    {p.thumbnailDocument?.url ? (
                      <img src={p.thumbnailDocument.url} alt={p.name} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
                        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                        <span className="text-xs">No Image</span>
                      </div>
                    )}

                    {/* Live pulse badge overlay */}
                    {isLive && (
                      <div className="-mt-7 px-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live Trading
                        </span>
                      </div>
                    )}
                    {isPresale && (
                      <div className="-mt-7 px-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-2.5 py-1 text-xs font-bold text-white shadow-md">
                          <Clock className="h-3 w-3" /> Presale Active
                        </span>
                      </div>
                    )}

                    <div className="space-y-3 px-5 pb-5 pt-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-heading font-bold truncate group-hover:text-primary transition-colors">{p.name}</h3>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{p.address}</span>
                          </p>
                        </div>
                        <PropertyStatusBadge status={p.status} />
                      </div>

                      {/* Sale status + yield APY */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${sale.color}`}>
                          {sale.label}
                        </span>
                        {p.salePeriodStart && p.salePeriodEnd && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {shortDate(p.salePeriodStart)} – {shortDate(p.salePeriodEnd)}
                          </span>
                        )}
                        {holderYield && (
                          <span className="ml-auto flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-600">
                            <Percent className="h-3 w-3" />{holderYield}% APY
                          </span>
                        )}
                      </div>

                      {/* Market price + TVL or presale info */}
                      {stats ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {isLive ? 'Live Price' : 'Presale Price'}
                            </p>
                            <p className="font-heading text-sm font-bold text-primary">{fmt(stats.currentPrice)}</p>
                          </div>
                          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">TVL</p>
                            <p className="font-heading text-sm font-bold text-amber-600">{fmt(stats.tvl)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {[...Array(2)].map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                          ))}
                        </div>
                      )}

                      {/* Presale progress */}
                      {isPresale && positionsMap[p.id] ? (
                        <PresaleMiniInfo positionData={positionsMap[p.id]} />
                      ) : isPresale && p.targetFundUSD && stats ? (
                        <TokenSaleProgress bought={stats.tvl} target={p.targetFundUSD} />
                      ) : null}

                      {/* CTA */}
                      <button
                        onClick={() => navigate(`/property/${p.id}`)}
                        className={`w-full flex items-center justify-center gap-2 text-sm ${isLive ? 'btn-candy' : 'flex items-center justify-center gap-1.5 rounded-xl border-2 border-blue-400 bg-blue-500 px-3 py-2 font-bold text-white shadow-[2px_2px_0_#1e40af] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1e40af]'}`}
                      >
                        {isLive ? (
                          <><ArrowUpRight className="h-4 w-4" /> Trade Tokens</>
                        ) : (
                          <><ShoppingCart className="h-4 w-4" /> Buy Tokens</>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
