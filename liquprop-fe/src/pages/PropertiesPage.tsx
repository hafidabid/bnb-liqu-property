import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, MapPin, Calendar, Target, Percent, Ruler, ImageOff, ShieldCheck, ArrowRight, Building2 } from 'lucide-react'

import Header from '@/components/layout/Header'
import { PropertyStatusBadge } from '@/components/property/PropertyStatusBadge'
import { listProperties, type ApiProperty } from '@/lib/apicall/property'

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

function shortDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_ORDER: Record<string, number> = {
  TOKEN_LIVE: 0,
  LISTED: 1,
  TOKENIZED: 2,
  REGISTERED: 3,
  PENDING_REVIEW: 4,
  DRAFT: 5,
  SUSPENDED: 6,
}

const STATUS_LABELS: Record<string, string> = {
  TOKEN_LIVE: 'Live Market',
  LISTED: 'Presale',
  TOKENIZED: 'Tokenized',
  REGISTERED: 'Registered',
  PENDING_REVIEW: 'Under Review',
  DRAFT: 'Draft',
  SUSPENDED: 'Suspended',
}

export default function PropertiesPage() {
  const navigate = useNavigate()

  const [properties, setProperties] = useState<ApiProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'target'>('newest')

  useEffect(() => {
    setLoading(true)
    listProperties(1, 100)
      .then((res) => setProperties(unwrapArray<ApiProperty>(res)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const propertyTypes = useMemo(() => {
    const types = new Set(properties.map((p) => p.propertyType).filter(Boolean))
    return Array.from(types).sort()
  }, [properties])

  const filtered = useMemo(() => {
    let result = properties.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.address.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || p.status === filterStatus
      const matchType = filterType === 'all' || p.propertyType === filterType
      return matchSearch && matchStatus && matchType
    })

    if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'target') result = [...result].sort((a, b) => (b.targetFundUSD ?? 0) - (a.targetFundUSD ?? 0))
    else result = [...result].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())

    return result
  }, [properties, search, filterStatus, filterType, sortBy])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10 space-y-8">

        {/* Hero */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">Property Registry</span>
          </div>
          <h1 className="font-heading text-4xl font-extrabold">Browse All Properties</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Research and discover real estate assets on LiquProp — from newly registered to fully tokenized. Review property details, legal docs, and fundamentals before investing.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-foreground/20 bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border-2 border-foreground/20 bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {propertyTypes.length > 0 && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border-2 border-foreground/20 bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none capitalize"
              >
                <option value="all">All Types</option>
                {propertyTypes.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-xl border-2 border-foreground/20 bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="newest">Status / Newest</option>
              <option value="name">Name A–Z</option>
              <option value="target">Highest Target</option>
            </select>
          </div>

          <span className="text-sm text-muted-foreground ml-auto">
            {filtered.length} {filtered.length === 1 ? 'property' : 'properties'}
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border-2 border-foreground/10 bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-foreground/20 py-20 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground" strokeWidth={1} />
            <p className="font-heading font-bold">No properties found</p>
            <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const holderYield = p.sla ? (p.sla.holderYieldBPS / 100).toFixed(1) : null
              const hasLegal = !!(p.legalEntityName || p.legalRegistrationId)
              const isInvestable = ['TOKENIZED', 'LISTED', 'TOKEN_LIVE'].includes(p.status)

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/property/${p.id}`)}
                  className="group cursor-pointer rounded-2xl border-2 border-foreground bg-card shadow-pop transition-transform hover:-translate-y-1 hover:shadow-pop-violet overflow-hidden"
                >
                  {/* Thumbnail */}
                  {p.thumbnailDocument?.url ? (
                    <img src={p.thumbnailDocument.url} alt={p.name} className="h-44 w-full object-cover" />
                  ) : (
                    <div className="flex h-44 w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
                      <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                      <span className="text-xs">No Image</span>
                    </div>
                  )}

                  <div className="space-y-3 p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-bold truncate group-hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{p.address}</span>
                        </p>
                      </div>
                      <PropertyStatusBadge status={p.status} />
                    </div>

                    {/* Property type + legal indicators */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs capitalize text-muted-foreground">
                        {p.propertyType}
                      </span>
                      {hasLegal && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          <ShieldCheck className="h-3 w-3" /> Legal Verified
                        </span>
                      )}
                    </div>

                    {/* Key fundamentals */}
                    <div className="grid grid-cols-3 gap-2">
                      {p.targetFundUSD != null && (
                        <div className="flex flex-col items-center rounded-lg bg-blue-50 border border-blue-200 p-2 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Target</p>
                          <p className="font-heading text-sm font-bold text-blue-600 flex items-center gap-0.5">
                            <Target className="h-3 w-3" />{fmt(p.targetFundUSD)}
                          </p>
                        </div>
                      )}
                      {holderYield && (
                        <div className="flex flex-col items-center rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Yield</p>
                          <p className="font-heading text-sm font-bold text-emerald-600 flex items-center gap-0.5">
                            <Percent className="h-3 w-3" />{holderYield}%
                          </p>
                        </div>
                      )}
                      {p.totalAreaSqm != null && (
                        <div className="flex flex-col items-center rounded-lg bg-orange-50 border border-orange-200 p-2 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Area</p>
                          <p className="font-heading text-sm font-bold text-orange-600 flex items-center gap-0.5">
                            <Ruler className="h-3 w-3" />{p.totalAreaSqm.toLocaleString()} m²
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Sale dates if set */}
                    {p.salePeriodStart && p.salePeriodEnd && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        Sale: {shortDate(p.salePeriodStart)} – {shortDate(p.salePeriodEnd)}
                      </p>
                    )}

                    {/* CTA */}
                    <button className={`w-full flex items-center justify-center gap-2 text-sm ${isInvestable ? 'btn-candy' : 'btn-outline-pop'}`}>
                      {isInvestable ? 'View & Invest' : 'View Details'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
