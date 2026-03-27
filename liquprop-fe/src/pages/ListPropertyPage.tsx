import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Search,
  Eye,
  Edit3,
  ImagePlus,
  Youtube,
  X,
  FileText,
} from 'lucide-react'

import Header from '@/components/layout/Header'
import { PropertyWizard } from '@/components/property/PropertyWizard'
import { DocumentDropzone } from '@/components/property/DocumentDropzone'
import {
  createProperty,
  uploadDocument,
  uploadYoutubeUrl,
  updateProperty,
  setSLA,
  setSubscription,
  type CreatePropertyInput,
  type SetSLAInput,
} from '@/lib/apicall/property'

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  'Basic Info',
  'Legal + Docs',
  'Media',
  'Prospectus',
  'Token Sale',
  'Subscription',
  'Yield SLA',
  'Review',
]

const YOUTUBE_PATTERN = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

const CITY_PRESETS = [
  { label: 'Singapore', lat: 1.3521, lng: 103.8198, zoom: 11 },
  { label: 'Jakarta', lat: -6.2088, lng: 106.8456, zoom: 11 },
  { label: 'Bali', lat: -8.4095, lng: 115.1889, zoom: 11 },
]

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, 'Name is required'),
  propertyType: z.enum(['residential', 'commercial', 'agricultural', 'industrial']),
  description: z.string().min(10, 'Description is required (min 10 characters)'),
  address: z.string().min(5, 'Address is required'),
  latitude: z.number(),
  longitude: z.number(),
})

const step2Schema = z.object({
  legalEntityName: z.string().optional(),
  legalRegistrationId: z.string().optional(),
  legalNotaryName: z.string().optional(),
  totalAreaSqm: z.number().optional(),
})

const tokenSaleSchema = z
  .object({
    salePeriodStart: z.string().min(1, 'Sale start date is required'),
    salePeriodEnd: z.string().min(1, 'Sale end date is required'),
    targetFundUSD: z.number().positive('Must be a positive amount'),
  })
  .refine(
    (d) => {
      if (!d.salePeriodStart || !d.salePeriodEnd) return true
      return new Date(d.salePeriodStart) < new Date(d.salePeriodEnd)
    },
    { message: 'End date must be after start date', path: ['salePeriodEnd'] }
  )

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type TokenSaleData = z.infer<typeof tokenSaleSchema>

// ─── Geocoding types ──────────────────────────────────────────────────────────

interface GeoFeature {
  id: string
  place_name: string
  center: [number, number]
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ListPropertyPage() {
  const { isConnected, status } = useAccount()
  const navigate = useNavigate()

  // Handled by ProtectedRoute component

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Collected data ───────────────────────────────────────────────────────
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
  const [legalTitleFile, setLegalTitleFile] = useState<File | null>(null)
  const [legalRegFile, setLegalRegFile] = useState<File | null>(null)

  // ── Media step state ─────────────────────────────────────────────────────
  const [mediaImages, setMediaImages] = useState<File[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeError, setYoutubeError] = useState<string | null>(null)
  const [thumbnailIndex, setThumbnailIndex] = useState<number | null>(null)

  const [prospectusFile, setProspectusFile] = useState<File | null>(null)
  const [prospectusMarkdown, setProspectusMarkdown] = useState('')
  const [prospectusTab, setProspectusTab] = useState<'write' | 'preview'>('write')
  const [tokenSaleData, setTokenSaleData] = useState<TokenSaleData | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<'MONTHLY' | 'YIELD_PERCENTAGE'>('MONTHLY')
  const [yieldSLA, setYieldSLA] = useState({
    holderYieldBPS: 7000,
    baselineYieldBPS: 2000,
    yieldPeriodDays: 30,
    reportPeriodDays: 30,
  })

  // ── Draft vs Publish dialog ──────────────────────────────────────────────
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  // ── Map state ────────────────────────────────────────────────────────────
  const [viewState, setViewState] = useState({
    longitude: CITY_PRESETS[0].lng,
    latitude: CITY_PRESETS[0].lat,
    zoom: CITY_PRESETS[0].zoom,
  })
  const [mapSearch, setMapSearch] = useState('')
  const [geoResults, setGeoResults] = useState<GeoFeature[]>([])
  const [showGeoDropdown, setShowGeoDropdown] = useState(false)
  const geoDropdownRef = useRef<HTMLDivElement>(null)

  // ── Legal confirm dialog ─────────────────────────────────────────────────
  const [showLegalConfirm, setShowLegalConfirm] = useState(false)
  const pendingStep2Data = useRef<Step2Data | null>(null)

  // ── Forms ────────────────────────────────────────────────────────────────
  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: '',
      propertyType: 'residential',
      description: '',
      address: '',
      latitude: CITY_PRESETS[0].lat,
      longitude: CITY_PRESETS[0].lng,
    },
  })

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
  })

  const formTokenSale = useForm<TokenSaleData>({
    resolver: zodResolver(tokenSaleSchema),
    defaultValues: { salePeriodStart: '', salePeriodEnd: '', targetFundUSD: undefined },
  })

  // ── Derived yield values ─────────────────────────────────────────────────
  const holderBPS = yieldSLA.holderYieldBPS
  const baselineBPS = yieldSLA.baselineYieldBPS
  const platformBPS = subscriptionPlan === 'MONTHLY' ? 0 : 300
  const maxBPS = 10000 - platformBPS
  const bpsWarning = holderBPS + baselineBPS > maxBPS

  // ── Map: marker lat/lon from form ────────────────────────────────────────
  const lat = form1.watch('latitude')
  const lon = form1.watch('longitude')

  const onMarkerDrag = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      form1.setValue('latitude', parseFloat(e.lngLat.lat.toFixed(6)))
      form1.setValue('longitude', parseFloat(e.lngLat.lng.toFixed(6)))
    },
    [form1]
  )

  const flyToCity = (city: (typeof CITY_PRESETS)[0]) => {
    form1.setValue('latitude', city.lat)
    form1.setValue('longitude', city.lng)
    setViewState({ longitude: city.lng, latitude: city.lat, zoom: city.zoom })
  }

  // ── Map geocoding search ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapSearch || mapSearch.length < 3 || !MAPBOX_TOKEN) {
      setGeoResults([])
      setShowGeoDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(mapSearch)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
        )
        const data = await res.json()
        setGeoResults(data.features ?? [])
        setShowGeoDropdown(true)
      } catch {
        /* silently ignore geocoding errors */
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [mapSearch])

  // Close geo dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (geoDropdownRef.current && !geoDropdownRef.current.contains(e.target as Node)) {
        setShowGeoDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectGeoResult = (feature: GeoFeature) => {
    const [lng, featureLat] = feature.center
    form1.setValue('latitude', parseFloat(featureLat.toFixed(6)))
    form1.setValue('longitude', parseFloat(lng.toFixed(6)))
    setViewState({ longitude: lng, latitude: featureLat, zoom: 14 })
    setMapSearch(feature.place_name)
    setShowGeoDropdown(false)
    setGeoResults([])
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const handleStep1 = form1.handleSubmit((data) => {
    setStep1Data(data)
    goNext()
  })

  const handleStep2 = form2.handleSubmit((data) => {
    const hasLegal = data.legalEntityName || data.legalRegistrationId || data.legalNotaryName
    if (!hasLegal) {
      pendingStep2Data.current = data
      setShowLegalConfirm(true)
      return
    }
    setStep2Data(data)
    goNext()
  })

  const confirmLegalEmpty = () => {
    setStep2Data(pendingStep2Data.current)
    setShowLegalConfirm(false)
    goNext()
  }

  const handleTokenSale = formTokenSale.handleSubmit((data) => {
    setTokenSaleData(data)
    goNext()
  })

  // ── Final Submit ──────────────────────────────────────────────────────────
  const handleFinalSubmit = async (publish: boolean) => {
    if (!step1Data || !tokenSaleData) return
    setSubmitting(true)
    setShowPublishDialog(false)
    setError(null)
    try {
      const body: CreatePropertyInput = {
        name: step1Data.name,
        description: step1Data.description,
        propertyType: step1Data.propertyType,
        address: step1Data.address,
        latitude: step1Data.latitude,
        longitude: step1Data.longitude,
        ...(step2Data?.totalAreaSqm ? { totalAreaSqm: step2Data.totalAreaSqm } : {}),
        ...(step2Data?.legalEntityName ? { legalEntityName: step2Data.legalEntityName } : {}),
        ...(step2Data?.legalRegistrationId
          ? { legalRegistrationId: step2Data.legalRegistrationId }
          : {}),
        ...(step2Data?.legalNotaryName ? { legalNotaryName: step2Data.legalNotaryName } : {}),
        ...(prospectusMarkdown ? { prospectusMarkdown } : {}),
        salePeriodStart: tokenSaleData.salePeriodStart,
        salePeriodEnd: tokenSaleData.salePeriodEnd,
        targetFundUSD: tokenSaleData.targetFundUSD,
      }

      const property = await createProperty(body)
      const propertyId = property.id

      // Upload legal + prospectus docs in parallel
      const uploads: Promise<unknown>[] = []
      if (legalTitleFile) uploads.push(uploadDocument(propertyId, legalTitleFile, 'LEGAL_TITLE'))
      if (legalRegFile) uploads.push(uploadDocument(propertyId, legalRegFile, 'LEGAL_REGISTRATION'))
      if (prospectusFile) uploads.push(uploadDocument(propertyId, prospectusFile, 'PROSPECTUS'))
      await Promise.all(uploads)

      // Upload images sequentially to get back IDs for thumbnail selection
      let thumbnailDocumentId: string | undefined
      for (let i = 0; i < mediaImages.length; i++) {
        const doc = await uploadDocument(propertyId, mediaImages[i], 'IMAGE')
        if (i === thumbnailIndex) {
          thumbnailDocumentId = doc.id
        }
      }

      // Upload YouTube URL if provided
      if (youtubeUrl && YOUTUBE_PATTERN.test(youtubeUrl)) {
        await uploadYoutubeUrl(propertyId, youtubeUrl)
      }

      // Set thumbnail if selected
      if (thumbnailDocumentId) {
        await updateProperty(propertyId, { thumbnailDocumentId })
      }

      // Subscription first (so setSLA can derive platform BPS)
      await setSubscription(propertyId, subscriptionPlan)

      // SLA
      const slaBody: SetSLAInput = {
        yieldPeriodDays: yieldSLA.yieldPeriodDays,
        reportPeriodDays: yieldSLA.reportPeriodDays,
        holderYieldBPS: yieldSLA.holderYieldBPS,
        baselineYieldBPS: yieldSLA.baselineYieldBPS,
      }
      await setSLA(propertyId, slaBody)

      // Publish to launchpad if requested
      if (publish) {
        await updateProperty(propertyId, { status: 'PENDING_REVIEW' })
      }

      navigate('/my-properties')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isConnected && (status === 'reconnecting' || status === 'connecting')) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!isConnected) return null

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-10">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold">List Your Property</h1>
          <p className="mt-1 text-muted-foreground">
            Tokenize your real-world asset in {STEPS.length} easy steps.
          </p>
        </div>

        <PropertyWizard steps={STEPS} currentStep={step}>
          {/* ─── STEP 0: Basic Info ─────────────────────────────────────── */}
          {step === 0 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <h2 className="font-heading text-xl font-bold">Basic Information</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Property Name *</label>
                  <input
                    {...form1.register('name')}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. Ocean View Villa"
                  />
                  {form1.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form1.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold">Property Type *</label>
                  <select
                    {...form1.register('propertyType')}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="agricultural">Agricultural</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold">
                  Description *{' '}
                  <span className="font-normal text-muted-foreground">(required)</span>
                </label>
                <textarea
                  {...form1.register('description')}
                  rows={3}
                  className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Describe the property — location highlights, key features, investment rationale…"
                />
                {form1.formState.errors.description && (
                  <p className="text-xs text-destructive">
                    {form1.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold">Address *</label>
                <input
                  {...form1.register('address')}
                  className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="123 Orchard Road, Singapore 238856"
                />
                {form1.formState.errors.address && (
                  <p className="text-xs text-destructive">
                    {form1.formState.errors.address.message}
                  </p>
                )}
              </div>

              {/* Map section */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Pin Location on Map</label>

                {/* City quick-select */}
                <div className="flex flex-wrap gap-2">
                  {CITY_PRESETS.map((city) => (
                    <button
                      key={city.label}
                      type="button"
                      onClick={() => flyToCity(city)}
                      className="flex items-center gap-1 rounded-full border-2 border-foreground/20 bg-background px-3 py-1 text-xs font-semibold transition-all hover:border-primary hover:text-primary"
                    >
                      <MapPin className="h-3 w-3" />
                      {city.label}
                    </button>
                  ))}
                </div>

                {/* Geocoding search */}
                {MAPBOX_TOKEN && (
                  <div className="relative" ref={geoDropdownRef}>
                    <div className="flex items-center gap-2 rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 focus-within:border-primary">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        type="text"
                        value={mapSearch}
                        onChange={(e) => setMapSearch(e.target.value)}
                        placeholder="Search for a place…"
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                      />
                    </div>
                    {showGeoDropdown && geoResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border-2 border-foreground/20 bg-background shadow-pop">
                        {geoResults.map((feature) => (
                          <button
                            key={feature.id}
                            type="button"
                            onMouseDown={() => selectGeoResult(feature)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="truncate">{feature.place_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {MAPBOX_TOKEN ? (
                  <div className="overflow-hidden rounded-xl border-2 border-foreground/20">
                    <Map
                      mapboxAccessToken={MAPBOX_TOKEN}
                      {...viewState}
                      onMove={(evt) => setViewState(evt.viewState)}
                      style={{ width: '100%', height: 280 }}
                      mapStyle="mapbox://styles/mapbox/light-v11"
                    >
                      <Marker
                        longitude={lon}
                        latitude={lat}
                        draggable
                        onDragEnd={onMarkerDrag}
                      />
                    </Map>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-foreground/20 text-sm text-muted-foreground">
                    Set VITE_MAPBOX_TOKEN to enable map picker
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Latitude</label>
                    <input
                      readOnly
                      value={lat}
                      className="w-full rounded-lg border-2 border-foreground/10 bg-muted px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Longitude
                    </label>
                    <input
                      readOnly
                      value={lon}
                      className="w-full rounded-lg border-2 border-foreground/10 bg-muted px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <StepNav onBack={goBack} isFirst />
            </form>
          )}

          {/* ─── STEP 1: Legal + Documents ──────────────────────────────── */}
          {step === 1 && (
            <>
              <form onSubmit={handleStep2} className="space-y-5">
                <h2 className="font-heading text-xl font-bold">Legal Information & Documents</h2>
                <p className="text-sm text-muted-foreground">
                  Legal information is{' '}
                  <span className="font-semibold text-amber-600">strongly recommended</span>. It
                  builds investor trust and provides a legal umbrella for the tokenized asset.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Legal Entity Name</label>
                    <input
                      {...form2.register('legalEntityName')}
                      className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      placeholder="e.g. My Property LLC"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Legal Registration ID</label>
                    <input
                      {...form2.register('legalRegistrationId')}
                      className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      placeholder="e.g. LLC-123456"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold">
                    Notary / Legal Umbrella{' '}
                    <span className="font-normal text-amber-600">(strongly recommended)</span>
                  </label>
                  <input
                    {...form2.register('legalNotaryName')}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="Name of notary, law firm, or company acting as legal umbrella"
                  />
                  <p className="text-xs text-muted-foreground">
                    Person or company legally responsible for the asset (notary, escrow agent,
                    trustee, etc.)
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold">Total Area (sqm)</label>
                  <input
                    type="number"
                    {...form2.register('totalAreaSqm', { valueAsNumber: true })}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. 250"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Legal Title Document</label>
                    <DocumentDropzone
                      label="Upload legal title"
                      file={legalTitleFile}
                      onFile={setLegalTitleFile}
                      onRemove={() => setLegalTitleFile(null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Legal Registration Document</label>
                    <DocumentDropzone
                      label="Upload registration doc"
                      file={legalRegFile}
                      onFile={setLegalRegFile}
                      onRemove={() => setLegalRegFile(null)}
                    />
                  </div>
                </div>

                <StepNav onBack={goBack} />
              </form>

              {/* Legal confirm dialog */}
              {showLegalConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="mx-4 w-full max-w-sm rounded-2xl border-2 border-foreground/20 bg-background p-6 shadow-pop">
                    <div className="mb-3 flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-5 w-5" strokeWidth={2.5} />
                      <span className="font-heading font-bold">No legal information provided</span>
                    </div>
                    <p className="mb-5 text-sm text-muted-foreground">
                      You haven't filled in any legal information (entity name, registration ID, or
                      notary). Investors may be less confident without a legal umbrella. Are you
                      sure you want to continue?
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowLegalConfirm(false)}
                        className="btn-outline-pop flex-1"
                      >
                        Go back & fill in
                      </button>
                      <button
                        type="button"
                        onClick={confirmLegalEmpty}
                        className="flex-1 rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100"
                      >
                        Continue anyway
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── STEP 2: Media ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl font-bold">Media</h2>
              <p className="text-sm text-muted-foreground">
                Upload property photos and an optional YouTube video. Click a photo to set it as the thumbnail.
              </p>

              {/* Image Upload */}
              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-primary" strokeWidth={2.5} />
                  Property Photos
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/20 p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImagePlus className="h-8 w-8" strokeWidth={1.5} />
                  <span>Click to select images (JPEG, PNG, WEBP)</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? [])
                      setMediaImages((prev) => {
                        const next = [...prev, ...files]
                        if (thumbnailIndex === null && next.length > 0) setThumbnailIndex(0)
                        return next
                      })
                      e.target.value = ''
                    }}
                  />
                </label>

                {mediaImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {mediaImages.map((file, idx) => {
                      const url = URL.createObjectURL(file)
                      const isThumb = thumbnailIndex === idx
                      return (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={file.name}
                            className={`h-24 w-full rounded-xl border-2 object-cover cursor-pointer transition-all ${
                              isThumb
                                ? 'border-primary shadow-pop-emerald'
                                : 'border-foreground/20 hover:border-primary/60'
                            }`}
                            onClick={() => setThumbnailIndex(idx)}
                          />
                          {isThumb && (
                            <div className="absolute top-1 left-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Cover
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setMediaImages((prev) => prev.filter((_, i) => i !== idx))
                              if (thumbnailIndex === idx) setThumbnailIndex(mediaImages.length > 1 ? 0 : null)
                              else if (thumbnailIndex !== null && thumbnailIndex > idx) setThumbnailIndex(thumbnailIndex - 1)
                            }}
                            className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {mediaImages.length > 0 && (
                  <p className="text-xs text-muted-foreground">Click a photo to set it as the cover thumbnail.</p>
                )}
              </div>

              {/* YouTube URL */}
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-destructive" strokeWidth={2.5} />
                  YouTube Video <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value)
                    setYoutubeError(null)
                  }}
                  onBlur={() => {
                    if (youtubeUrl && !YOUTUBE_PATTERN.test(youtubeUrl)) {
                      setYoutubeError('Please enter a valid YouTube URL')
                    }
                  }}
                  className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {youtubeError && <p className="text-xs text-destructive">{youtubeError}</p>}
              </div>

              <StepNav onBack={goBack} onNext={youtubeError ? undefined : goNext} />
            </div>
          )}

          {/* ─── STEP 3: Prospectus ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-heading text-xl font-bold">Prospectus</h2>
              <p className="text-sm text-muted-foreground">
                Upload a PDF prospectus and/or write the prospectus content directly in markdown.
                Both are optional but strongly recommended — they build investor confidence.
              </p>

              <div className="space-y-1">
                <label className="text-sm font-semibold">Upload Prospectus PDF</label>
                <DocumentDropzone
                  label="Upload prospectus (PDF)"
                  accept={{ 'application/pdf': ['.pdf'] }}
                  file={prospectusFile}
                  onFile={setProspectusFile}
                  onRemove={() => setProspectusFile(null)}
                />
              </div>

              {/* Markdown editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Prospectus Content (Markdown)</label>
                  <div className="flex overflow-hidden rounded-lg border-2 border-foreground/20 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setProspectusTab('write')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                        prospectusTab === 'write'
                          ? 'bg-primary text-white'
                          : 'bg-background hover:bg-muted'
                      }`}
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setProspectusTab('preview')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                        prospectusTab === 'preview'
                          ? 'bg-primary text-white'
                          : 'bg-background hover:bg-muted'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>
                  </div>
                </div>

                {prospectusTab === 'write' ? (
                  <textarea
                    value={prospectusMarkdown}
                    onChange={(e) => setProspectusMarkdown(e.target.value)}
                    rows={12}
                    className="w-full rounded-xl border-2 border-foreground/20 bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
                    placeholder={`# Property Prospectus\n\n## Overview\nDescribe the investment opportunity here...\n\n## Financial Highlights\n- Expected APY: X%\n- Token price: $X\n- Total tokens: X\n\n## Legal Structure\n...\n\n## Risk Factors\n...`}
                  />
                ) : (
                  <div className="min-h-[300px] rounded-xl border-2 border-foreground/20 bg-background p-4">
                    {prospectusMarkdown ? (
                      <MarkdownPreview content={prospectusMarkdown} />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nothing to preview yet. Switch to Write tab and add some markdown content.
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Supports headings (#, ##, ###), bold (**text**), italic (*text*), and bullet
                  lists (- item).
                </p>
              </div>

              <StepNav onBack={goBack} onNext={goNext} />
            </div>
          )}

          {/* ─── STEP 4: Token Sale ─────────────────────────────────────── */}
          {step === 4 && (
            <form onSubmit={handleTokenSale} className="space-y-5">
              <h2 className="font-heading text-xl font-bold">Token Sale Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Define the fundraising window. The offering matures when the sale period ends{' '}
                <strong>or</strong> when the target fund is fully subscribed — whichever comes
                first.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Sale Period Start *</label>
                  <input
                    type="datetime-local"
                    {...formTokenSale.register('salePeriodStart')}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  {formTokenSale.formState.errors.salePeriodStart && (
                    <p className="text-xs text-destructive">
                      {formTokenSale.formState.errors.salePeriodStart.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold">Sale Period End *</label>
                  <input
                    type="datetime-local"
                    {...formTokenSale.register('salePeriodEnd')}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  {formTokenSale.formState.errors.salePeriodEnd && (
                    <p className="text-xs text-destructive">
                      {formTokenSale.formState.errors.salePeriodEnd.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold">Target Fund (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    {...formTokenSale.register('targetFundUSD', { valueAsNumber: true })}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background py-2 pl-7 pr-3 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. 500000"
                  />
                </div>
                {formTokenSale.formState.errors.targetFundUSD && (
                  <p className="text-xs text-destructive">
                    {formTokenSale.formState.errors.targetFundUSD.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Total amount in USD needed to fulfill this offering. The sale matures once this
                  target is reached or the sale period ends.
                </p>
              </div>

              {/* Maturity rules callout */}
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-sm">
                <p className="font-semibold text-primary">Maturity Conditions</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>
                    • <strong>Time-based:</strong> Offering matures automatically when the sale end
                    date is reached.
                  </li>
                  <li>
                    • <strong>Target-based:</strong> Offering matures early once the target fund
                    amount is fully subscribed.
                  </li>
                </ul>
              </div>

              <StepNav onBack={goBack} />
            </form>
          )}

          {/* ─── STEP 5: Subscription Plan ──────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="font-heading text-xl font-bold">Subscription Plan</h2>
              <p className="text-sm text-muted-foreground">
                Choose how you pay the platform fee. Your choice determines the platform's share in
                the Yield SLA step.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <PlanCard
                  title="Monthly Flat"
                  subtitle="$2,000 / month"
                  badge="Platform: 0% on-chain"
                  badgeColor="bg-primary/10 text-primary"
                  description="Flat monthly fee. The platform takes no on-chain yield cut — all yield goes to holders and the baseline pool."
                  selected={subscriptionPlan === 'MONTHLY'}
                  onClick={() => setSubscriptionPlan('MONTHLY')}
                />
                <PlanCard
                  title="Yield Percentage"
                  subtitle="3% per distribution"
                  badge="Platform: 3% on-chain"
                  badgeColor="bg-tertiary/10 text-tertiary"
                  description="No monthly fee. Platform takes 3% of every yield distribution automatically on-chain."
                  selected={subscriptionPlan === 'YIELD_PERCENTAGE'}
                  onClick={() => setSubscriptionPlan('YIELD_PERCENTAGE')}
                />
              </div>
              <StepNav onBack={goBack} onNext={goNext} />
            </div>
          )}

          {/* ─── STEP 6: Yield SLA ──────────────────────────────────────── */}
          {step === 6 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl font-bold">Yield SLA</h2>
              <p className="text-sm text-muted-foreground">
                Configure how yield is split between token holders and the baseline protection
                pool. The platform share is fixed by your subscription.
              </p>

              {/* Platform share locked badge */}
              <div
                className={`flex items-center justify-between rounded-xl border-2 p-3 text-sm ${
                  subscriptionPlan === 'MONTHLY'
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-tertiary/30 bg-tertiary/5'
                }`}
              >
                <span className="font-semibold">
                  Platform Share{' '}
                  <span className="font-normal text-muted-foreground">(locked by subscription)</span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-bold text-xs ${
                    subscriptionPlan === 'MONTHLY'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-tertiary/15 text-tertiary'
                  }`}
                >
                  {subscriptionPlan === 'MONTHLY' ? '0%' : '3%'} fixed
                </span>
              </div>

              {bpsWarning && (
                <div className="flex items-center gap-2 rounded-lg border-2 border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  Holder + Baseline exceeds {(maxBPS / 100).toFixed(0)}%. Please reduce one of
                  them.
                </div>
              )}

              <div className="space-y-4">
                <SliderField
                  label="Holder Yield"
                  value={holderBPS}
                  max={maxBPS}
                  onChange={(v) =>
                    setYieldSLA((d) => ({
                      ...d,
                      holderYieldBPS: v,
                      baselineYieldBPS: maxBPS - v,
                    }))
                  }
                  color="bg-primary"
                />
                <SliderField
                  label="Baseline Protection"
                  value={baselineBPS}
                  max={maxBPS}
                  onChange={(v) =>
                    setYieldSLA((d) => ({
                      ...d,
                      baselineYieldBPS: v,
                      holderYieldBPS: maxBPS - v,
                    }))
                  }
                  color="bg-tertiary"
                />
                <div className="flex items-center justify-between rounded-lg border-2 border-foreground/10 bg-muted px-4 py-3">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Combined (Holder + Baseline{platformBPS > 0 ? ' + Platform share 3%' : ''})
                  </span>
                  <span
                    className={`font-bold ${bpsWarning ? 'text-destructive' : 'text-foreground'}`}
                  >
                    {((holderBPS + baselineBPS + platformBPS) / 100).toFixed(2)}% /{' '}
                    100% max
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Yield Period (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={yieldSLA.yieldPeriodDays}
                    onChange={(e) =>
                      setYieldSLA((d) => ({
                        ...d,
                        yieldPeriodDays: parseInt(e.target.value) || 30,
                      }))
                    }
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Report Period (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={yieldSLA.reportPeriodDays}
                    onChange={(e) =>
                      setYieldSLA((d) => ({
                        ...d,
                        reportPeriodDays: parseInt(e.target.value) || 30,
                      }))
                    }
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <StepNav onBack={goBack} onNext={bpsWarning ? undefined : goNext} />
            </div>
          )}

          {/* ─── STEP 7: Review & Submit ─────────────────────────────────── */}
          {step === 7 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl font-bold">Review & Submit</h2>
              <p className="text-sm text-muted-foreground">
                Review everything before creating your property.
              </p>

              <div className="space-y-3 rounded-xl border-2 border-foreground/10 p-4 text-sm">
                <p className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Basic Info
                </p>
                <ReviewRow label="Name" value={step1Data?.name ?? '—'} />
                <ReviewRow label="Type" value={step1Data?.propertyType ?? '—'} />
                <ReviewRow label="Address" value={step1Data?.address ?? '—'} />
                <ReviewRow
                  label="Coordinates"
                  value={step1Data ? `${step1Data.latitude}, ${step1Data.longitude}` : '—'}
                />
                <ReviewRow
                  label="Description"
                  value={
                    step1Data?.description
                      ? step1Data.description.slice(0, 80) +
                        (step1Data.description.length > 80 ? '…' : '')
                      : '—'
                  }
                />

                <hr className="border-foreground/10" />
                <p className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Legal
                </p>
                <ReviewRow label="Legal Entity" value={step2Data?.legalEntityName || '—'} />
                <ReviewRow
                  label="Registration ID"
                  value={step2Data?.legalRegistrationId || '—'}
                />
                <ReviewRow
                  label="Notary / Legal Umbrella"
                  value={step2Data?.legalNotaryName || '—'}
                />
                <ReviewRow
                  label="Area (sqm)"
                  value={step2Data?.totalAreaSqm?.toString() || '—'}
                />
                <ReviewRow label="Legal Title Doc" value={legalTitleFile?.name || 'None'} />
                <ReviewRow label="Legal Reg Doc" value={legalRegFile?.name || 'None'} />

                <hr className="border-foreground/10" />
                <p className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Media
                </p>
                <ReviewRow label="Photos" value={mediaImages.length > 0 ? `${mediaImages.length} image(s)` : 'None'} />
                <ReviewRow label="Thumbnail" value={thumbnailIndex !== null ? mediaImages[thumbnailIndex]?.name ?? 'None' : 'None'} />
                <ReviewRow label="YouTube URL" value={youtubeUrl || 'None'} />

                <hr className="border-foreground/10" />
                <p className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Prospectus
                </p>
                <ReviewRow label="Prospectus PDF" value={prospectusFile?.name || 'None'} />
                <ReviewRow
                  label="Markdown content"
                  value={prospectusMarkdown ? `${prospectusMarkdown.length} chars` : 'None'}
                />

                <hr className="border-foreground/10" />
                <p className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Token Sale
                </p>
                <ReviewRow
                  label="Sale Start"
                  value={
                    tokenSaleData?.salePeriodStart
                      ? new Date(tokenSaleData.salePeriodStart).toLocaleString()
                      : '—'
                  }
                />
                <ReviewRow
                  label="Sale End"
                  value={
                    tokenSaleData?.salePeriodEnd
                      ? new Date(tokenSaleData.salePeriodEnd).toLocaleString()
                      : '—'
                  }
                />
                <ReviewRow
                  label="Target Fund"
                  value={
                    tokenSaleData?.targetFundUSD
                      ? `$${tokenSaleData.targetFundUSD.toLocaleString()}`
                      : '—'
                  }
                />

                <hr className="border-foreground/10" />
                <p className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Subscription & Yield SLA
                </p>
                <ReviewRow
                  label="Subscription"
                  value={
                    subscriptionPlan === 'MONTHLY'
                      ? 'Monthly Flat ($2k/mo)'
                      : 'Yield Percentage (3%)'
                  }
                />
                <ReviewRow
                  label="Platform Share"
                  value={subscriptionPlan === 'MONTHLY' ? '0% (fixed)' : '3% (fixed)'}
                />
                <ReviewRow label="Holder Yield" value={`${(holderBPS / 100).toFixed(2)}%`} />
                <ReviewRow
                  label="Baseline Protection"
                  value={`${(baselineBPS / 100).toFixed(2)}%`}
                />
                <ReviewRow label="Yield Period" value={`${yieldSLA.yieldPeriodDays} days`} />
                <ReviewRow label="Report Period" value={`${yieldSLA.reportPeriodDays} days`} />
              </div>

              {error && (
                <div className="rounded-lg border-2 border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="btn-outline-pop flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setShowPublishDialog(true)}
                  disabled={submitting}
                  className="btn-candy flex flex-1 items-center justify-center gap-2"
                >
                  {submitting ? (
                    'Creating…'
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Submit Property
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </PropertyWizard>

        {/* ─── Draft vs Publish Dialog ──────────────────────────────────── */}
        {showPublishDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop space-y-4">
              {/* <h3 className="font-heading text-lg font-bold">How would you like to submit?</h3>
              <p className="text-sm text-muted-foreground">
                Choose whether to save your property as a private draft, or submit it for admin review to list on the launchpad.
              </p> */}
              <h3 className="font-heading text-lg font-bold">Save as Draft?</h3>
              <p className="text-sm text-muted-foreground">
                Your property will be saved privately. You can review and publish it later from My Properties.
              </p>

              {/* <div className="grid gap-3 sm:grid-cols-2"> */}
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(false)}
                  disabled={submitting}
                  className="rounded-xl border-2 border-foreground/20 bg-background p-4 text-left hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
                    <span className="font-heading font-bold text-sm">Save as Draft</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saved privately. You can review and publish later from My Properties.
                  </p>
                </button>

                {/* <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  disabled={submitting}
                  className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors shadow-pop-emerald"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={2.5} />
                    <span className="font-heading font-bold text-sm text-primary">Publish to Launchpad</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submitted for admin review. Once approved, it will be live on the launchpad.
                  </p>
                </button> */}
              </div>

              <button
                type="button"
                onClick={() => setShowPublishDialog(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepNav({
  onBack,
  onNext,
  isFirst,
}: {
  onBack: () => void
  onNext?: () => void
  isFirst?: boolean
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {!isFirst && (
        <button
          type="button"
          onClick={onBack}
          className="btn-outline-pop flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}
      <button
        type={onNext ? 'button' : 'submit'}
        onClick={onNext}
        className="btn-candy flex flex-1 items-center justify-center gap-2"
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function SliderField({
  label,
  value,
  max,
  onChange,
  color,
}: {
  label: string
  value: number
  max: number
  onChange: (v: number) => void
  color: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="font-bold text-foreground">{(value / 100).toFixed(2)}%</span>
      </div>
      <div className="relative">
        <div className="h-3 w-full overflow-hidden rounded-full border-2 border-foreground/20 bg-muted">
          <div
            className={`h-full ${color} transition-all`}
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={max}
          step={100}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}

function PlanCard({
  title,
  subtitle,
  badge,
  badgeColor,
  description,
  selected,
  onClick,
}: {
  title: string
  subtitle: string
  badge: string
  badgeColor: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
        selected
          ? 'border-primary bg-primary/5 shadow-pop'
          : 'border-foreground/20 hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-heading font-bold">{title}</div>
          <div className="text-sm font-semibold text-primary">{subtitle}</div>
          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${badgeColor}`}>
            {badge}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        </div>
        <div
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${
            selected ? 'border-primary bg-primary' : 'border-foreground/30'
          }`}
        />
      </div>
    </button>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1 text-sm">
      {lines.map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h3 key={i} className="mt-3 text-base font-bold">
              {applyInline(line.slice(4))}
            </h3>
          )
        if (line.startsWith('## '))
          return (
            <h2 key={i} className="mt-4 text-lg font-bold">
              {applyInline(line.slice(3))}
            </h2>
          )
        if (line.startsWith('# '))
          return (
            <h1 key={i} className="mt-4 text-xl font-bold">
              {applyInline(line.slice(2))}
            </h1>
          )
        if (line.startsWith('- '))
          return (
            <li key={i} className="ml-4 list-disc">
              {applyInline(line.slice(2))}
            </li>
          )
        if (/^\d+\. /.test(line))
          return (
            <li key={i} className="ml-4 list-decimal">
              {applyInline(line.replace(/^\d+\. /, ''))}
            </li>
          )
        if (line === '')
          return <div key={i} className="h-2" />
        return (
          <p key={i} className="leading-relaxed">
            {applyInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function applyInline(text: string): React.ReactNode {
  // Bold + italic inline replacement
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}
