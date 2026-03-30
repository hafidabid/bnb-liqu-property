import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChainId, useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, ExternalLink, ArrowLeft, Calendar, Target, Ruler, Building2, Scale, UserCheck, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import Header from '@/components/layout/Header'
import { PropertyStatusBadge } from '@/components/property/PropertyStatusBadge'
import { YieldChart } from '@/components/property/YieldChart'
import { MarketStatsBar } from '@/components/property/MarketStatsBar'
import { PriceChart } from '@/components/property/PriceChart'
import { DividendTable } from '@/components/property/DividendTable'
import { InvestDialog } from '@/components/property/InvestDialog'
import { DeployGuardDialog } from '@/components/property/DeployGuardDialog'
import { SwapPanel } from '@/components/property/SwapPanel'
import { PresalePanel } from '@/components/property/PresalePanel'
import { WrapUnwrapDialog } from '@/components/property/WrapUnwrapDialog'
import useEmblaCarousel from 'embla-carousel-react'
import { PrincipleTokenABI } from '@/lib/abis/PrincipleTokenABI'
import {
  getProperty,
  getSLA,
  listDocuments,
  listReports,
  getYieldHistory,
  listTransactions,
  syncTransactions,
  type ApiProperty,
  type ApiSLA,
  type ApiDocument,
  type ApiReport,
  type YieldDistribution,
  type BlockchainTx,
} from '@/lib/apicall/property'
import { getMarketStats, getPriceHistory, type MarketStats, type PricePoint, type PriceRange } from '@/lib/apicall/market'
import { loadContractAddresses } from '@/lib/apicall/chains'
import { usePrincipleTokenBalance } from '@/hooks/usePrincipleTokenBalance'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function unwrapArray<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[]
  const obj = r as Record<string, unknown>
  if (obj && Array.isArray(obj.data)) return obj.data as T[]
  return []
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const chainId = useChainId()
  const { isConnected, address } = useAccount()

  const [property, setProperty] = useState<ApiProperty | null>(null)
  const [sla, setSla] = useState<ApiSLA | null>(null)
  const [documents, setDocuments] = useState<ApiDocument[]>([])
  const [reports, setReports] = useState<ApiReport[]>([])
  const [yieldHistory, setYieldHistory] = useState<YieldDistribution[]>([])
  const [txHistory, setTxHistory] = useState<BlockchainTx[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null)
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [priceRange, setPriceRange] = useState<PriceRange>('all')
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false)

  const [isInvestOpen, setIsInvestOpen] = useState(false)
  const [isDeployOpen, setIsDeployOpen] = useState(false)
  const [wrapUnwrapState, setWrapUnwrapState] = useState<{ mode: 'wrap' | 'unwrap'; open: boolean } | null>(null)

  const [emblaRef, emblaApi] = useEmblaCarousel()
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [activeDocTab, setActiveDocTab] = useState<string | null>(null)
  const [PTContractAddress, setPtContractAddress] = useState<`0x${string}` | null>(null)
  const [usdcAddress, setUsdcAddress] = useState<string | null>(null)
  const [swapRouterAddress, setSwapRouterAddress] = useState<string | null>(null)


  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedImageIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi])

  useEffect(() => {
    const loadContract = async () => {
      const contracts = await loadContractAddresses(chainId)
      setPtContractAddress(contracts['CH_PT'] as `0x${string}`)
      if (contracts['CH_USDC']) setUsdcAddress(contracts['CH_USDC'])
      if (contracts['SWAP_ROUTER_PT']) setSwapRouterAddress(contracts['SWAP_ROUTER_PT'])
    }
    loadContract()
  }, [chainId])

  useEffect(() => {
    if (documents.length > 0 && !activeDocTab) {
      const pdfs = documents.filter(d => d.type !== 'IMAGE')
      if (pdfs.length > 0) setActiveDocTab(pdfs[0].id)
    }
  }, [documents, activeDocTab])

  const { data: positionData } = useReadContract({
    address: PTContractAddress as `0x${string}`,
    abi: PrincipleTokenABI,
    functionName: 'getIdToPosition',
    args: property?.tokenId ? [BigInt(property.tokenId)] : undefined,
    query: {
      enabled: !!PTContractAddress && !!property?.tokenId
    }
  })

  const { balance: myTokenBalance, refetch: refetchMyBalance } = usePrincipleTokenBalance(
    PTContractAddress,
    (property as any)?.tokenId,
  )

  const yieldTokenAddress = (positionData as any)?.yieldToken

  const { data: myYieldTokenBalanceRaw, refetch: refetchYieldBalance } = useReadContract({
    address: yieldTokenAddress as `0x${string}`,
    abi: [{
      type: 'function',
      name: 'balanceOf',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    }],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!yieldTokenAddress && !!address,
    }
  })

  // Safe checks for guard deployment
  const isGuardDeployed = Boolean(
    positionData && (positionData as any).guard && (positionData as any).guard !== '0x0000000000000000000000000000000000000000'
  )

  const isExpired = positionData
    ? BigInt(Math.floor(Date.now() / 1000)) >= (positionData as any).expiry
    : false
  const isFullySold = positionData
    ? (positionData as any).presaleAmount === 0n
    : false

  const soldAmount: bigint = positionData ? BigInt((positionData as any).totalSupply ?? 0) - BigInt((positionData as any).presaleAmount ?? 0) : 0n
  const totalSupply: bigint = positionData ? BigInt((positionData as any).totalSupply ?? 0) : 0n
  const fulfillmentPerc: bigint = totalSupply > 0n ? (soldAmount * 100n) / totalSupply : 0n

  const isPropertyOwner = address?.toLowerCase() === (positionData as any)?.owner?.toLowerCase()
  const canDeploy = !isGuardDeployed && isPropertyOwner && (isExpired || isFullySold || fulfillmentPerc > 50n)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    const fetchAll = async () => {
      try {
        // Sync pending transactions first
        await syncTransactions(id).catch(e => console.error('Sync failed:', e))

        const [propRes, slaRes, docsRes, reportsRes, yieldRes, txRes] = await Promise.allSettled([
          getProperty(id),
          getSLA(id),
          listDocuments(id),
          listReports(id),
          getYieldHistory(id),
          listTransactions(id),
        ])

        if (propRes.status === 'fulfilled') setProperty(propRes.value)
        else setError('Property not found')

        if (slaRes.status === 'fulfilled' && slaRes.value) setSla(slaRes.value)
        else if (propRes.status === 'fulfilled' && (propRes.value as any).sla) setSla((propRes.value as any).sla)
        if (docsRes.status === 'fulfilled') setDocuments(unwrapArray<ApiDocument>(docsRes.value))
        if (reportsRes.status === 'fulfilled') setReports(unwrapArray<ApiReport>(reportsRes.value))
        if (yieldRes.status === 'fulfilled') setYieldHistory(unwrapArray<YieldDistribution>(yieldRes.value))
        if (txRes.status === 'fulfilled') setTxHistory(unwrapArray<BlockchainTx>(txRes.value))
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [id])

  // Fetch market stats + initial price history when property loads
  useEffect(() => {
    const tokenId = (property as any)?.tokenId
    if (!tokenId) return
    setMarketLoading(true)
    Promise.allSettled([
      getMarketStats(tokenId.toString(), chainId.toString()),
      getPriceHistory(tokenId.toString(), chainId.toString(), priceRange),
    ]).then(([statsRes, histRes]) => {
      if (statsRes.status === 'fulfilled') setMarketStats(statsRes.value)
      if (histRes.status === 'fulfilled') setPriceHistory(unwrapArray<PricePoint>(histRes.value))
    }).finally(() => setMarketLoading(false))
  }, [property])

  // Re-fetch price history when range changes
  useEffect(() => {
    const tokenId = (property as any)?.tokenId
    if (!tokenId) return
    setPriceHistoryLoading(true)
    getPriceHistory(tokenId.toString(), chainId.toString(), priceRange)
      .then(res => setPriceHistory(unwrapArray<PricePoint>(res)))
      .finally(() => setPriceHistoryLoading(false))
  }, [priceRange])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-10 space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border-2 border-foreground/10 bg-muted" />
          ))}
        </main>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-10 text-center">
          <p className="text-muted-foreground">{error ?? 'Property not found.'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-candy mt-4">
            Back to Dashboard
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl py-10">
        {/* ─── Back ─────────────────────────────────────────────── */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Left Column */}
          <div className="space-y-8 lg:col-span-8">
            {/* ─── Header ───────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-3xl font-extrabold">{property.name}</h1>
                <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="text-sm">{property.address}</span>
                </div>
                <p className="mt-1 text-xs capitalize text-muted-foreground">{property.propertyType}</p>
              </div>
              <PropertyStatusBadge status={property.status} />
            </div>

            {/* ─── Image Carousel ───────────────────────────────────── */}
            {(() => {
              const images: string[] = []
              if (property.thumbnailDocument?.url) {
                images.push(property.thumbnailDocument.url)
              }
              documents.forEach(doc => {
                if (doc.type === 'IMAGE' && doc.url && doc.url !== property.thumbnailDocument?.url) {
                  images.push(doc.url)
                }
              })

              if (images.length === 0) return null

              return (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border-2 border-foreground shadow-pop" ref={emblaRef}>
                    <div className="flex touch-pan-y">
                      {images.map((src, i) => (
                        <div key={i} className="relative min-w-full flex-[0_0_100%] h-[400px]">
                          <img src={src} className="absolute inset-0 h-full w-full object-cover" alt={`Property image ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar w-full items-center justify-center">
                      {images.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => emblaApi?.scrollTo(i)}
                          className={`relative h-16 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${selectedImageIndex === i
                            ? 'border-primary opacity-100 ring-2 ring-primary ring-offset-2 ring-offset-background'
                            : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                          <img src={src} className="absolute inset-0 h-full w-full object-cover" alt={`Thumbnail ${i + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ─── Sale Period ─────────────────────────────────────── */}
            {(() => {
              const sale = getSaleStatus(property.salePeriodStart, property.salePeriodEnd)
              return (
                <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${sale.color}`}>
                      {sale.label}
                    </span>
                    {property.salePeriodStart && property.salePeriodEnd && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {shortDate(property.salePeriodStart)} – {shortDate(property.salePeriodEnd)}
                      </span>
                    )}
                    {property.targetFundUSD != null && (
                      <span className="ml-auto flex items-center gap-1.5 text-sm font-semibold">
                        <Target className="h-4 w-4 text-blue-600" />
                        Target: <span className="text-blue-600">{fmtUSD(property.targetFundUSD)}</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ─── Property Details ────────────────────────────────── */}
            <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
              <h2 className="mb-4 font-heading font-bold">Property Details</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {property.totalAreaSqm != null && (
                  <div className="flex items-center gap-3 rounded-xl border-2 border-foreground/10 p-3">
                    <Ruler className="h-5 w-5 text-orange-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Area</p>
                      <p className="font-semibold">{property.totalAreaSqm.toLocaleString()} m²</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 rounded-xl border-2 border-foreground/10 p-3">
                  <Building2 className="h-5 w-5 text-violet-500 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Property Type</p>
                    <p className="font-semibold capitalize">{property.propertyType}</p>
                  </div>
                </div>
                {property.legalEntityName && (
                  <div className="flex items-center gap-3 rounded-xl border-2 border-foreground/10 p-3">
                    <Scale className="h-5 w-5 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Legal Entity</p>
                      <p className="font-semibold">{property.legalEntityName}</p>
                      {property.legalRegistrationId && (
                        <p className="text-xs text-muted-foreground">Reg: {property.legalRegistrationId}</p>
                      )}
                    </div>
                  </div>
                )}
                {property.legalNotaryName && (
                  <div className="flex items-center gap-3 rounded-xl border-2 border-foreground/10 p-3">
                    <UserCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Notary</p>
                      <p className="font-semibold">{property.legalNotaryName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Map ──────────────────────────────────────────────── */}
            {MAPBOX_TOKEN && property.latitude && property.longitude ? (
              <div className="overflow-hidden rounded-2xl border-2 border-foreground shadow-pop">
                <Map
                  mapboxAccessToken={MAPBOX_TOKEN}
                  initialViewState={{
                    longitude: property.longitude,
                    latitude: property.latitude,
                    zoom: 14,
                  }}
                  style={{ width: '100%', height: 320 }}
                  mapStyle="mapbox://styles/mapbox/light-v11"
                >
                  <Marker longitude={property.longitude} latitude={property.latitude} />
                </Map>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-foreground/20 text-sm text-muted-foreground">
                {MAPBOX_TOKEN ? 'Location data unavailable' : 'Set VITE_MAPBOX_TOKEN to view map'}
              </div>
            )}

            {/* ─── Market Stats Bar ─────────────────────────────────── */}
            {isGuardDeployed ? (
              ((property as any).tokenId || marketLoading) && (
                <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
                  <h2 className="mb-4 font-heading font-bold">Market Data</h2>
                  <MarketStatsBar stats={marketStats} loading={marketLoading} />
                </div>
              )
            ) : (
              <div className="rounded-2xl border-2 border-foreground bg-muted p-5 text-center text-sm text-muted-foreground shadow-pop">
                <span className="font-semibold text-foreground">Market Data Hidden</span> — Trading will be available after the presale concludes.
              </div>
            )}

            {/* ─── Description ──────────────────────────────────────── */}
            {property.description && (
              <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
                <h2 className="mb-2 font-heading font-bold">About</h2>
                <p className="text-sm text-muted-foreground">{property.description}</p>
              </div>
            )}

            {/* ─── Prospectus ─────────────────────────────────────── */}
            {property.prospectusMarkdown && (
              <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
                <h2 className="mb-2 font-heading font-bold">Prospectus</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <ReactMarkdown>{property.prospectusMarkdown}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* ─── SLA Info ─────────────────────────────────────────── */}
            {sla && (
              <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
                <h2 className="mb-4 font-heading font-bold">Yield SLA</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SLAStat label="Holder Yield" value={`${(sla.holderYieldBPS / 100).toFixed(2)}%`} color="text-primary" />
                  <SLAStat label="Baseline Protection" value={`${(sla.baselineYieldBPS / 100).toFixed(2)}%`} color="text-tertiary" />
                  <SLAStat label="Yield Period" value={`${sla.yieldPeriodDays} days`} />
                  <SLAStat label="Report Period" value={`${sla.reportPeriodDays} days`} />
                </div>
              </div>
            )}

            {/* ─── Price Chart ──────────────────────────────────────── */}
            {isGuardDeployed && (
              <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
                <h2 className="mb-4 font-heading font-bold">Price History</h2>
                <PriceChart
                  data={priceHistory}
                  range={priceRange}
                  onRangeChange={setPriceRange}
                  loading={marketLoading || priceHistoryLoading}
                />
              </div>
            )}

            {/* ─── Yield History ────────────────────────────────────── */}
            <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
              <h2 className="mb-4 font-heading font-bold">Yield Distributions</h2>
              <DividendTable data={yieldHistory} />
            </div>

            {/* ─── Yield Chart ──────────────────────────────────────── */}
            {yieldHistory.length > 0 && (
              <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
                <h2 className="mb-4 font-heading font-bold">Yield Chart</h2>
                <YieldChart data={yieldHistory} />
              </div>
            )}

            {/* ─── Reports ──────────────────────────────────────────── */}
            <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop space-y-3">
              <h2 className="font-heading font-bold">Reports</h2>
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((r) => {
                    const explorerBase = txHistory[0]?.chain?.blockExplorerUrl ?? 'https://base-sepolia.blockscout.com'
                    return (
                      <div key={r.id} className="rounded-xl border-2 border-foreground/10 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {shortDate(r.reportPeriodStart)} → {shortDate(r.reportPeriodEnd)}
                          </p>
                          {(r.submittedAt ?? r.createdAt) && (
                            <p className="text-xs text-muted-foreground shrink-0">
                              {shortDate(r.submittedAt ?? r.createdAt)}
                            </p>
                          )}
                        </div>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                        {r.documents && r.documents.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {r.documents.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg border-2 border-foreground/10 bg-muted/40 px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 text-tertiary shrink-0" />
                                {`Document ${r.documents!.length > 1 ? i + 1 : ''}`}
                                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                        {r.onChainTxHash && (
                          <a
                            href={`${explorerBase}/tx/${r.onChainTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on-chain acknowledgement
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ─── Transactions ─────────────────────────────────────── */}
            {txHistory.filter(t => t.type !== 'SWAP_TOKEN').length > 0 && (
              <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop space-y-3">
                <h2 className="font-heading font-bold">On-Chain Transactions</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-foreground/10">
                        {['Date', 'Type', 'Tx Hash', 'Status'].map((h) => (
                          <th key={h} className="pb-2 pr-4 text-left text-xs font-bold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/10">
                      {txHistory.filter(t => t.type !== 'SWAP_TOKEN').map((tx) => {
                        const explorerBase = tx.chain?.blockExplorerUrl ?? 'https://base-sepolia.blockscout.com'
                        const statusStyle =
                          tx.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            tx.status === 'FAILED' ? 'bg-red-100 text-red-800 border-red-300' :
                              'bg-amber-100 text-amber-800 border-amber-300'
                        return (
                          <tr key={tx.id} className="hover:bg-muted/40">
                            <td className="py-2 pr-4 text-xs whitespace-nowrap text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleString()}
                            </td>
                            <td className="py-2 pr-4 text-xs font-semibold">
                              {{
                                REGISTER_PROPERTY: 'Register Property',
                                MINT_PRINCIPLE: 'Tokenize Asset',
                                DISTRIBUTE_YIELD: 'Distribute Yield',
                                DEPLOY_GUARD: 'Deploy Guard',
                                SWAP_TOKEN: 'Token Swap'
                              }[tx.type] || tx.type}
                            </td>
                            <td className="py-2 pr-4 font-mono text-xs">
                              <a
                                href={`${explorerBase}/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <span className="max-w-[160px] truncate">{tx.txHash}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </td>
                            <td className="py-2">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyle}`}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── Swap History ─────────────────────────────────────── */}
            {txHistory.filter(t => t.type === 'SWAP_TOKEN').length > 0 && (
              <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop space-y-3">
                <h2 className="font-heading font-bold">Swap History</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-foreground/10">
                        {['Date', 'Type', 'Tx Hash', 'Status'].map((h) => (
                          <th key={h} className="pb-2 pr-4 text-left text-xs font-bold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/10">
                      {txHistory.filter(t => t.type === 'SWAP_TOKEN').map((tx) => {
                        const explorerBase = tx.chain?.blockExplorerUrl ?? 'https://base-sepolia.blockscout.com'
                        const statusStyle =
                          tx.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                            tx.status === 'FAILED' ? 'bg-red-100 text-red-800 border-red-300' :
                              'bg-amber-100 text-amber-800 border-amber-300'
                        return (
                          <tr key={tx.id} className="hover:bg-muted/40">
                            <td className="py-2 pr-4 text-xs whitespace-nowrap text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleString()}
                            </td>
                            <td className="py-2 pr-4 text-xs font-semibold">
                              Token Swap
                            </td>
                            <td className="py-2 pr-4 font-mono text-xs">
                              <a
                                href={`${explorerBase}/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <span className="max-w-[160px] truncate">{tx.txHash}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </td>
                            <td className="py-2">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyle}`}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── Documents Tabs ───────────────────────────────────── */}
            {(() => {
              const pdfDocs = documents.filter(d => d.type !== 'IMAGE')
              if (pdfDocs.length === 0) return null

              const activeDoc = pdfDocs.find(d => d.id === activeDocTab) || pdfDocs[0]

              return (
                <div className="rounded-2xl border-2 border-foreground bg-card shadow-pop overflow-hidden">
                  <div className="border-b-2 border-foreground p-5 pb-0">
                    <h2 className="mb-4 font-heading font-bold text-xl">Documents</h2>
                    <div className="flex gap-4 overflow-x-auto">
                      {pdfDocs.map(doc => (
                        <button
                          key={doc.id}
                          onClick={() => setActiveDocTab(doc.id)}
                          className={`truncate whitespace-nowrap border-b-4 pb-3 px-2 text-sm font-bold transition-colors ${activeDocTab === doc.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          {doc.fileName === 'youtube_url' ? '▶ YouTube Video' : doc.fileName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted w-full aspect-[4/3] relative">
                    {activeDoc && activeDoc.url.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={`${activeDoc.url}#view=FitH`} className="w-full h-full border-none" title={activeDoc.fileName} />
                    ) : activeDoc && activeDoc.url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) ? (
                      <img src={activeDoc.url} alt={activeDoc.fileName} className="w-full h-full object-contain p-4" />
                    ) : activeDoc && activeDoc.fileName === 'youtube_url' ? (() => {
                      const m = activeDoc.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
                      const videoId = m?.[1]
                      return videoId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          className="w-full h-full border-none"
                          title="YouTube video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex w-full h-full items-center justify-center p-5">
                          <a href={activeDoc.url} target="_blank" rel="noreferrer" className="btn-candy">
                            Open Video Externally
                          </a>
                        </div>
                      )
                    })() : activeDoc ? (
                      <div className="flex w-full h-full items-center justify-center p-5">
                        <a href={activeDoc.url} target="_blank" rel="noreferrer" className="btn-candy">
                          Open Document Externally
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })()}

          </div> {/* End Main Left Column */}

          {/* ─── Sidebar Right Column ──────────────────────────────── */}
          <div className="space-y-6 lg:col-span-4">
            <div className="sticky top-24 space-y-6">

              {/* Critical CTA */}
              <div className="rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop">
                {isGuardDeployed ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-heading text-xl font-extrabold text-tertiary">Trading is Live</h2>
                      {marketStats?.currentPrice != null && (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current Price</p>
                          <p className="font-heading text-lg font-extrabold text-primary">
                            ${marketStats.currentPrice.toFixed(5)}
                          </p>
                        </div>
                      )}
                    </div>
                    {usdcAddress && swapRouterAddress && (positionData as any)?.yieldToken ? (
                      <SwapPanel
                        propertyId={property.id}
                        yieldTokenAddress={(positionData as any).yieldToken}
                        usdcAddress={usdcAddress}
                        swapRouterAddress={swapRouterAddress}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading swap…</p>
                    )}
                  </div>
                ) : ['TOKENIZED', 'LISTED', 'REGISTERED'].includes(property.status) ? (
                  <div className="space-y-4">
                    <h2 className="font-heading text-xl font-extrabold text-primary">Presale is Live</h2>
                    <p className="text-sm text-muted-foreground">
                      Purchase tokens at ground floor prices before market trading begins.
                      {isExpired && <span className="block mt-1 font-bold text-amber-600">Note: Sale period has ended, but tokens are still available!</span>}
                    </p>
                    <button
                      onClick={() => setIsInvestOpen(true)}
                      className="btn-candy w-full py-4 text-base"
                    >
                      Buy Presale Tokens
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="font-heading text-lg font-bold">Registration Phase</h2>
                    <p className="text-sm text-muted-foreground">Tokens will be available soon.</p>
                  </div>
                )}
              </div>

              {/* Presale Info Panel */}
              {positionData && (property.status === 'LISTED' || !isGuardDeployed) && (
                <PresalePanel
                  positionData={{
                    timestamp: (positionData as any).timestamp ?? 0n,
                    expiry: (positionData as any).expiry ?? 0n,
                    presaleAmount: (positionData as any).presaleAmount ?? 0n,
                    totalSupply: (positionData as any).totalSupply ?? 0n,
                    presalePrice: (positionData as any).presalePrice ?? 0n,
                  }}
                />
              )}

              {/* Deploy Guard */}
              {canDeploy && (
                <div className="rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop-amber space-y-4">
                  <h2 className="font-heading text-lg font-bold text-amber-600">Ready to Launch Trading</h2>
                  <p className="text-sm text-muted-foreground">
                    Presale conditions are met. Deploy the guard to open secondary market trading on Uniswap V3.
                  </p>
                  <button onClick={() => setIsDeployOpen(true)} className="btn-candy w-full py-3 bg-amber-400">
                    Finalize Assets and Release to Market
                  </button>
                </div>
              )}

              {/* Your Holdings */}
              {isConnected && (
                (!isGuardDeployed && myTokenBalance !== undefined && myTokenBalance > 0n) ||
                (isGuardDeployed && (
                  (myTokenBalance !== undefined && myTokenBalance > 0n) ||
                  (myYieldTokenBalanceRaw !== undefined && (myYieldTokenBalanceRaw as bigint) > 0n)
                ))
              ) && (
                  <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop-violet space-y-3">
                    <h3 className="font-heading font-bold text-foreground">Your Holdings</h3>

                    <div className="space-y-4">
                      {/* Unwrapped (Fractions) */}
                      {myTokenBalance !== undefined && myTokenBalance > 0n && (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-semibold text-muted-foreground">{isGuardDeployed ? 'Unwrapped Fractions' : 'Tokens Owned'}</span>
                            <div className="text-right">
                              <span className="font-heading text-lg font-extrabold text-indigo-600 block">
                                {myTokenBalance.toString()}
                              </span>
                              {!isGuardDeployed && positionData && (positionData as any).presalePrice > 0n && (
                                <span className="text-xs font-semibold text-primary block mt-0.5">
                                  {fmtUSD(Number(myTokenBalance) * Number((positionData as any).presalePrice) / 1e6)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isGuardDeployed && (
                            <button
                              onClick={() => setWrapUnwrapState({ mode: 'wrap', open: true })}
                              className="btn-outline-pop w-full py-2 text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300"
                            >
                              Wrap to Trade
                            </button>
                          )}
                        </div>
                      )}

                      {/* Wrapped (YieldTokens) */}
                      {isGuardDeployed && myYieldTokenBalanceRaw !== undefined && (myYieldTokenBalanceRaw as bigint) > 0n && (
                        <div className="space-y-2 border-t-2 border-foreground/10 pt-4">
                          <div className="flex justify-between">
                            <span className="text-sm font-semibold text-muted-foreground">Wrapped for Trading</span>
                            <div className="text-right">
                              <span className="font-heading text-lg font-extrabold text-amber-600 block">
                                {Number(formatUnits(myYieldTokenBalanceRaw as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 })} YT
                              </span>
                              {marketStats?.currentPrice && (
                                <span className="text-xs font-semibold text-primary block mt-0.5">
                                  {fmtUSD(Number(formatUnits(myYieldTokenBalanceRaw as bigint, 18)) * marketStats.currentPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setWrapUnwrapState({ mode: 'unwrap', open: true })}
                            className="btn-outline-pop w-full py-2 text-xs border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300"
                          >
                            Unwrap for Yield
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                )}

              {/* Quick SLA Summary for sidebar context */}
              {sla && (
                <div className="rounded-2xl border-2 border-foreground bg-muted p-5 space-y-4">
                  <h3 className="font-heading font-bold text-foreground">SLA Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b-2 border-foreground/10 pb-2">
                      <span className="text-sm text-muted-foreground">Holder Yield</span>
                      <span className="font-bold text-primary">{(sla.holderYieldBPS / 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between border-b-2 border-foreground/10 pb-2">
                      <span className="text-sm text-muted-foreground">Baseline Yield</span>
                      <span className="font-bold text-tertiary">{(sla.baselineYieldBPS / 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div> {/* End Sidebar */}
        </div>
      </main>

      <InvestDialog
        isOpen={isInvestOpen}
        onClose={() => setIsInvestOpen(false)}
        tokenId={(property as any).tokenId}
        propertyPrice={positionData ? Number((positionData as any).presalePrice ?? 0n) / 1e6 : 0}
        principleTokenAddress={PTContractAddress as `0x${string}`} //USNG PT address
        onSuccess={() => {
          refetchMyBalance()
          refetchYieldBalance()
        }}
      />
      <DeployGuardDialog
        isOpen={isDeployOpen}
        onClose={() => setIsDeployOpen(false)}
        tokenId={(property as any).tokenId}
        propertyId={property.id}
        propertyName={property.name}
        presalePrice={(positionData as any)?.presalePrice ?? 0n}
        principleTokenAddress={PTContractAddress as string}
        onSuccess={() => {
          refetchMyBalance()
          refetchYieldBalance()
          // set deploy open false in a seconds and refresh page
          setTimeout(() => {
            setIsDeployOpen(false)
            window.location.reload()
          }, 2000)
        }}
      />
      {wrapUnwrapState && positionData && isGuardDeployed && PTContractAddress && (
        <WrapUnwrapDialog
          isOpen={wrapUnwrapState.open}
          onClose={() => setWrapUnwrapState(null)}
          mode={wrapUnwrapState.mode}
          tokenId={(property as any).tokenId}
          propertyPrice={(positionData as any).presalePrice}
          principleTokenAddress={PTContractAddress}
          yieldTokenAddress={(positionData as any).yieldToken}
          maxAmount={wrapUnwrapState.mode === 'wrap'
            ? Number(myTokenBalance ?? 0)
            : Number((myYieldTokenBalanceRaw as bigint) / ((positionData as any).presalePrice * 1000000000000n))}
          onSuccess={() => {
            refetchMyBalance()
            refetchYieldBalance()
          }}
        />
      )}
    </div>
  )
}

function SLAStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border-2 border-foreground/10 bg-muted p-3 text-center">
      <div className={`font-heading text-xl font-extrabold ${color ?? 'text-foreground'}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
