import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useWalletClient, useChainId, usePublicClient } from 'wagmi'

import { decodeEventLog } from 'viem'
import { Building2, FileText, BarChart3, Plus, RefreshCw, DollarSign, TrendingUp, Activity, ExternalLink, CheckCircle2, ImageOff } from 'lucide-react'
import { GasEstimationPreview, type GasEstimate } from '@/components/wallet/GasEstimationPreview'
import { useGasSettings } from '@/hooks/useGasSettings'

import Header from '@/components/layout/Header'
import { PropertyStatusBadge } from '@/components/property/PropertyStatusBadge'
import { YieldChart } from '@/components/property/YieldChart'
import { DocumentDropzone } from '@/components/property/DocumentDropzone'
import { MarketStatsBar } from '@/components/property/MarketStatsBar'
import { PriceChart } from '@/components/property/PriceChart'
import { DividendTable } from '@/components/property/DividendTable'
import { YieldReportDialog } from '@/components/property/YieldReportDialog'
import {
  getMyProperties,
  submitRegisterProperty,
  submitMintPrinciple,
  listReports,
  submitReport,
  getYieldHistory,
  listTransactions,
  getSLA,
  setSLA,
  getSubscription,
  setSubscription,
  updateProperty,
  type ApiProperty,
  type ApiSLA,
  type ApiReport,
  type YieldDistribution,
  type BlockchainTx,
} from '@/lib/apicall/property'
import { getMarketStats, getPriceHistory, type MarketStats, type PricePoint } from '@/lib/apicall/market'
import { loadContractAddresses } from '@/lib/apicall/chains'
import { PrincipleTokenABI, PrincipleAssetABI } from '@/lib/abis'

function unwrapArray<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[]
  const obj = r as Record<string, unknown>
  if (obj && Array.isArray(obj.data)) return obj.data as T[]
  return []
}

export default function MyPropertiesPage() {
  const { isConnected, status } = useAccount()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'properties' | 'reports' | 'yield' | 'market' | 'transactions'>('properties')
  const [properties, setProperties] = useState<ApiProperty[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProperties = async () => {
    setLoading(true)
    try {
      const res = await getMyProperties()
      setProperties(unwrapArray<ApiProperty>(res))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) fetchProperties()
  }, [isConnected])

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
      <main className="container py-10 space-y-8">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold">My Properties</h1>
            <p className="mt-1 text-muted-foreground">Manage your tokenized real estate portfolio.</p>
          </div>
          <button
            onClick={() => navigate('/list-property')}
            className="btn-candy flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> List Property
          </button>
        </div>

        {/* ─── Tabs ───────────────────────────────────────────── */}
        <div className="flex gap-2 border-b-2 border-foreground/10 pb-0">
          {([
            { key: 'properties', label: 'My Properties', icon: Building2 },
            { key: 'reports', label: 'Reports', icon: FileText },
            { key: 'yield', label: 'Yield History', icon: BarChart3 },
            { key: 'market', label: 'Market Data', icon: TrendingUp },
            { key: 'transactions', label: 'Transactions', icon: Activity },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors -mb-0.5 ${activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.5} />
              {label}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ────────────────────────────────────── */}
        {activeTab === 'properties' && (
          <PropertiesTab
            properties={properties}
            loading={loading}
            onRefresh={fetchProperties}
          />
        )}
        {activeTab === 'reports' && <ReportsTab properties={properties} />}
        {activeTab === 'yield' && <YieldTab properties={properties} />}
        {activeTab === 'market' && <MarketDataTab properties={properties} />}
        {activeTab === 'transactions' && <TransactionsTab properties={properties} />}
      </main>
    </div>
  )
}

// ─── Tab: Properties ─────────────────────────────────────────────────────────

function PropertiesTab({
  properties,
  loading,
  onRefresh,
}: {
  properties: ApiProperty[]
  loading: boolean
  onRefresh: () => void
}) {
  const navigate = useNavigate()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [yieldDialogProperty, setYieldDialogProperty] = useState<ApiProperty | null>(null)
  const [reportModalProperty, setReportModalProperty] = useState<ApiProperty | null>(null)
  const [registerSuccess, setRegisterSuccess] = useState<{ txHash: string; explorerUrl: string } | null>(null)
  const [txsMap, setTxsMap] = useState<Record<string, BlockchainTx[]>>({})
  const [preflightTarget, setPreflightTarget] = useState<{ property: ApiProperty; action: 'register' | 'mint' } | null>(null)

  // Gas settings & pre-flight estimation
  const { applyMultiplier, getGasPriceWei, settings } = useGasSettings()
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null)
  // Stores the continuation function that runs after user confirms the gas preview
  const pendingTxRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (properties.length === 0) return
    Promise.allSettled(properties.map((p) => listTransactions(p.id).then((txs) => ({ id: p.id, txs }))))
      .then((results) => {
        const map: Record<string, BlockchainTx[]> = {}
        for (const r of results) {
          if (r.status === 'fulfilled') map[r.value.id] = r.value.txs
        }
        setTxsMap(map)
      })
  }, [properties])

  /**
   * Estimates gas for a contract call, shows the GasEstimationPreview modal,
   * and returns a promise that resolves when the user confirms (with computed gas limit + gas price)
   * or rejects if they cancel.
   */
  const estimateAndConfirm = useCallback(
    async ({
      actionLabel,
      estimateParams,
    }: {
      actionLabel: string
      estimateParams: Parameters<NonNullable<typeof publicClient>['estimateContractGas']>[0]
    }): Promise<{ gasLimit: bigint; gasPriceWei: bigint | undefined }> => {
      if (!publicClient) throw new Error('No public client')

      const estimatedGas = await publicClient.estimateContractGas(estimateParams as any)
      const gasLimit = applyMultiplier(estimatedGas)
      const gasPriceWei = getGasPriceWei()
      const multiplier = parseFloat(settings.gasLimitMultiplier) || 1.3

      return new Promise((resolve, reject) => {
        setGasEstimate({ actionLabel, estimatedGas, gasLimit, gasPriceWei, multiplier })
        pendingTxRef.current = async () => {
          setGasEstimate(null)
          resolve({ gasLimit, gasPriceWei })
        }
          // Store reject so cancel can use it
          ; (pendingTxRef as any)._reject = () => {
            setGasEstimate(null)
            reject(new Error('Gas estimation cancelled by user'))
          }
      })
    },
    [publicClient, applyMultiplier, getGasPriceWei, settings.gasLimitMultiplier],
  )

  const handleRegisterOnChain = async (property: ApiProperty) => {
    if (!walletClient || !publicClient) return
    setActionLoading(property.id + '-register')
    setRegisterSuccess(null)
    try {
      // 1. Load contract addresses
      const contracts = await loadContractAddresses(chainId)
      const ptAddress = contracts['CH_PT']
      const assetAddress = contracts['CH_ASSET']

      if (!ptAddress || !assetAddress) {
        throw new Error('Required contract addresses (CH_PT or CH_ASSET) not found for this chain.')
      }

      // 2. Register Property — estimate gas first
      const metadataURI = `ipfs://liquprop/${property.id}`
      const account = walletClient.account

      const { gasLimit: registerGasLimit, gasPriceWei: registerGasPrice } = await estimateAndConfirm({
        actionLabel: 'Register Property',
        estimateParams: {
          address: ptAddress,
          abi: PrincipleTokenABI,
          functionName: 'registerProperty',
          args: [metadataURI],
          account,
        },
      })

      const txHash = await walletClient.writeContract({
        address: ptAddress,
        abi: PrincipleTokenABI,
        functionName: 'registerProperty',
        args: [metadataURI],
        gas: registerGasLimit,
        ...(registerGasPrice != null ? { gasPrice: registerGasPrice } : {}),
      })

      await submitRegisterProperty(property.id, txHash, chainId.toString())

      setActionLoading(property.id + '-waiting')
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      let extractedTokenId: number | null = null

      const propertyRegisteredAbi = [{
        type: 'event',
        name: 'PropertyRegistered',
        inputs: [
          { name: 'owner', type: 'address', indexed: true, internalType: 'address' },
          { name: 'tokenId', type: 'uint256', indexed: true, internalType: 'uint256' },
          { name: 'metadataURI', type: 'string', indexed: false, internalType: 'string' },
        ],
        anonymous: false,
      }]

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: propertyRegisteredAbi as any,
            data: log.data,
            topics: log.topics,
          }) as any
          if (decoded.eventName === 'PropertyRegistered') {
            extractedTokenId = Number(decoded.args.tokenId)
            break
          }
        } catch (e) { }
      }

      let mintTxHashStr = ''

      if (extractedTokenId !== null) {
        // 3. Approve PrincipleAsset for the PrincipleToken contract
        setActionLoading(property.id + '-approving')

        const { gasLimit: approveGasLimit, gasPriceWei: approveGasPrice } = await estimateAndConfirm({
          actionLabel: 'Approve Asset Transfer',
          estimateParams: {
            address: assetAddress,
            abi: PrincipleAssetABI,
            functionName: 'approve',
            args: [ptAddress, BigInt(extractedTokenId)],
            account: walletClient.account,
          },
        })

        const approveTxHash = await walletClient.writeContract({
          address: assetAddress,
          abi: PrincipleAssetABI,
          functionName: 'approve',
          args: [ptAddress, BigInt(extractedTokenId)],
          gas: approveGasLimit,
          ...(approveGasPrice != null ? { gasPrice: approveGasPrice } : {}),
        })
        await publicClient.waitForTransactionReceipt({ hash: approveTxHash })

        // 4. Load SLA and Subscription for Minting
        setActionLoading(property.id + '-loading-data')
        const [sla, subscription] = await Promise.all([
          getSLA(property.id).catch(() => null),
          getSubscription(property.id).catch(() => null)
        ])

        if (!sla || !subscription) {
          throw new Error('Property SLA or Subscription not found. Please click "Tokenize Asset" after data is configured.')
        }

        setActionLoading(property.id + '-minting')
        // 5. Minting
        const targetFund = property.targetFundUSD ? property.targetFundUSD * 1e6 : 500000 * 1e6
        const deadline = property.salePeriodEnd
          ? Math.floor(new Date(property.salePeriodEnd).getTime() / 1000)
          : Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30

        const feeType = subscription.plan === 'YIELD_PERCENTAGE' ? 0 : 1

        const holderYield = Number(sla.holderYieldBPS)
        const baselineYield = Number(sla.baselineYieldBPS)

        // Smart Contract Validations check
        if (feeType === 0) {
          if (holderYield + baselineYield > 9700) {
            throw new Error(`Invalid SLA configuration: For YIELD_PERCENTAGE, total yield BPS (${holderYield + baselineYield}) cannot exceed 9700.`)
          }
        } else {
          if (holderYield + baselineYield !== 10000) {
            throw new Error(`Invalid SLA configuration: For this plan, total yield BPS (${holderYield + baselineYield}) must exactly equal 10000.`)
          }
        }

        const positionInput = {
          totalSupply: 2, // SECOND = 100_000 shares
          presaleAmount: 10000, // 100%
          deadline: BigInt(deadline),
          tokenId: BigInt(extractedTokenId),
          presalePrice: BigInt(Math.floor(targetFund / 100000)),
          holderYieldBPS: BigInt(holderYield),
          baselineYieldBPS: BigInt(baselineYield),
          yieldPeriodSeconds: BigInt(sla.yieldPeriodDays * 24 * 60 * 60),
          reportPeriodSeconds: BigInt(sla.reportPeriodDays * 24 * 60 * 60),
          feeType: feeType
        }

        console.log('positionInput', positionInput)

        const { gasLimit: mintGasLimit, gasPriceWei: mintGasPrice } = await estimateAndConfirm({
          actionLabel: 'Mint Principle Token',
          estimateParams: {
            address: ptAddress,
            abi: PrincipleTokenABI,
            functionName: 'mintPrinciple',
            args: [positionInput],
            account: walletClient.account,
          },
        })

        const mintTxHash = await walletClient.writeContract({
          address: ptAddress,
          abi: PrincipleTokenABI,
          functionName: 'mintPrinciple',
          args: [positionInput],
          gas: mintGasLimit,
          ...(mintGasPrice != null ? { gasPrice: mintGasPrice } : {}),
        })

        await submitMintPrinciple(property.id, chainId.toString(), mintTxHash)
        mintTxHashStr = mintTxHash
      }

      setRegisterSuccess({
        txHash: mintTxHashStr || txHash,
        explorerUrl: 'https://base-sepolia.blockscout.com',
      })
      onRefresh()
    } catch (e) {
      console.error('Registration failed:', e)
      alert(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMintPrincipleOnChain = async (property: ApiProperty) => {
    if (!walletClient || !publicClient) return

    setActionLoading(property.id + '-minting')
    setRegisterSuccess(null)
    try {
      let extractedTokenId: number | null = property.tokenId ? Number(property.tokenId) : null

      if (extractedTokenId === null) {
        // Fallback: If DB hasn't synced the tokenId yet, fetch the REGISTER_PROPERTY tx hash
        // and decode the receipt logs to find the PropertyRegistered event.
        const txs = await listTransactions(property.id).catch(() => [] as BlockchainTx[])
        const registerTx = txs.find(t => t.type === 'REGISTER_PROPERTY')

        if (registerTx && registerTx.txHash) {
          const receipt = await publicClient.getTransactionReceipt({ hash: registerTx.txHash as `0x${string}` })
          const propertyRegisteredAbi = [{
            type: 'event',
            name: 'PropertyRegistered',
            inputs: [
              { name: 'owner', type: 'address', indexed: true, internalType: 'address' },
              { name: 'tokenId', type: 'uint256', indexed: true, internalType: 'uint256' },
              { name: 'metadataURI', type: 'string', indexed: false, internalType: 'string' },
            ],
            anonymous: false,
          }]

          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: propertyRegisteredAbi as any,
                data: log.data,
                topics: log.topics,
              }) as any
              if (decoded.eventName === 'PropertyRegistered') {
                extractedTokenId = Number(decoded.args.tokenId)
                break
              }
            } catch (e) { }
          }
        }
      }

      if (extractedTokenId === null) {
        throw new Error('Could not determine property tokenId from DB or on-chain history.')
      }

      // 1. Load data for contract interaction
      setActionLoading(property.id + '-loading-data')
      const [contracts, sla, subscription] = await Promise.all([
        loadContractAddresses(chainId),
        getSLA(property.id).catch(() => null),
        getSubscription(property.id).catch(() => null)
      ])

      const ptAddress = contracts['CH_PT']
      const assetAddress = contracts['CH_ASSET']

      if (!ptAddress || !assetAddress) {
        throw new Error('Required contract addresses (CH_PT or CH_ASSET) not found for this chain.')
      }
      if (!sla) throw new Error('Property SLA not found.')
      if (!subscription) throw new Error('Property Subscription not found.')

      // 2. Approve PrincipleAsset for the PrincipleToken contract
      setActionLoading(property.id + '-approving')

      const { gasLimit: approveGasLimit2, gasPriceWei: approveGasPrice2 } = await estimateAndConfirm({
        actionLabel: 'Approve Asset Transfer',
        estimateParams: {
          address: assetAddress,
          abi: PrincipleAssetABI,
          functionName: 'approve',
          args: [ptAddress, BigInt(extractedTokenId)],
          account: walletClient.account,
        },
      })

      const approveHash = await walletClient.writeContract({
        address: assetAddress,
        abi: PrincipleAssetABI,
        functionName: 'approve',
        args: [ptAddress, BigInt(extractedTokenId)],
        gas: approveGasLimit2,
        ...(approveGasPrice2 != null ? { gasPrice: approveGasPrice2 } : {}),
      })
      await publicClient.waitForTransactionReceipt({ hash: approveHash })

      // 3. Mint Principle
      setActionLoading(property.id + '-minting')

      const targetFund = property.targetFundUSD ? property.targetFundUSD * 1e6 : 500000 * 1e6
      const deadline = property.salePeriodEnd
        ? Math.floor(new Date(property.salePeriodEnd).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30

      const feeType = subscription.plan === 'YIELD_PERCENTAGE' ? 0 : 1

      const holderYield = Number(sla.holderYieldBPS)
      const baselineYield = Number(sla.baselineYieldBPS)

      // Smart Contract Validations check
      if (feeType === 0) {
        if (holderYield + baselineYield > 9700) {
          throw new Error(`Invalid SLA configuration: For YIELD_PERCENTAGE, total yield BPS (${holderYield + baselineYield}) cannot exceed 9700.`)
        }
      } else {
        if (holderYield + baselineYield !== 10000) {
          throw new Error(`Invalid SLA configuration: For this plan, total yield BPS (${holderYield + baselineYield}) must exactly equal 10000.`)
        }
      }

      // PositionInput mapping (following backend logic)
      const positionInput = {
        totalSupply: 2, // enum PrincipleSupply.SECOND = 100,000 shares
        presaleAmount: 10000, // 100% (uint16)
        deadline: BigInt(deadline),
        tokenId: BigInt(extractedTokenId),
        presalePrice: BigInt(Math.floor(targetFund / 100000)),
        holderYieldBPS: BigInt(holderYield),
        baselineYieldBPS: BigInt(baselineYield),
        yieldPeriodSeconds: BigInt(sla.yieldPeriodDays * 24 * 60 * 60),
        reportPeriodSeconds: BigInt(sla.reportPeriodDays * 24 * 60 * 60),
        feeType: feeType
      }

      console.log('positionInput', positionInput)

      const { gasLimit: mintGasLimit2, gasPriceWei: mintGasPrice2 } = await estimateAndConfirm({
        actionLabel: 'Mint Principle Token',
        estimateParams: {
          address: ptAddress,
          abi: PrincipleTokenABI,
          functionName: 'mintPrinciple',
          args: [positionInput],
          account: walletClient.account,
        },
      })

      const mintHash = await walletClient.writeContract({
        address: ptAddress,
        abi: PrincipleTokenABI,
        functionName: 'mintPrinciple',
        args: [positionInput],
        gas: mintGasLimit2,
        ...(mintGasPrice2 != null ? { gasPrice: mintGasPrice2 } : {}),
      })

      // 4. Notify backend
      await submitMintPrinciple(property.id, chainId.toString(), mintHash)

      setRegisterSuccess({
        txHash: mintHash,
        explorerUrl: 'https://base-sepolia.blockscout.com',
      })
      onRefresh()
    } catch (e) {
      console.error('Tokenization failed:', e)
      alert(e instanceof Error ? e.message : 'Tokenization failed')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border-2 border-foreground/10 bg-muted" />
        ))}
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-foreground/20 py-16 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground" strokeWidth={1} />
        <div>
          <p className="font-heading font-bold">No properties yet</p>
          <p className="text-sm text-muted-foreground">List your first property to get started.</p>
        </div>
        <button onClick={() => navigate('/list-property')} className="btn-candy flex items-center gap-2">
          <Plus className="h-4 w-4" /> List Property
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {registerSuccess && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" strokeWidth={2.5} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-primary">Transaction successful!</p>
            <p className="font-mono text-xs text-muted-foreground truncate">{registerSuccess.txHash}</p>
            <a
              href={`${registerSuccess.explorerUrl}/tx/${registerSuccess.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View on Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <button onClick={() => setRegisterSuccess(null)} className="shrink-0 text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border-2 border-foreground bg-card shadow-pop space-y-4 overflow-hidden"
          >
            {/* Thumbnail */}
            {p.thumbnailDocument?.url ? (
              <img
                src={p.thumbnailDocument.url}
                alt={p.name}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
                <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                <span className="text-xs">No Image</span>
              </div>
            )}

            <div className="px-5 pb-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-bold truncate">{p.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{p.address}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.propertyType}</p>
                </div>
                <PropertyStatusBadge status={p.status} />
              </div>

              {/* Latest tx hash */}
              {txsMap[p.id]?.[0] && (() => {
                const tx = txsMap[p.id][0]
                const explorerBase = tx.chain?.blockExplorerUrl ?? 'https://base-sepolia.blockscout.com'
                return (
                  <div className="rounded-lg border border-foreground/10 bg-muted/50 px-2.5 py-1.5 space-y-0.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Last transaction ({tx.type})
                    </p>
                    <a
                      href={`${explorerBase}/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                    >
                      <span className="max-w-[180px] truncate">{tx.txHash}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )
              })()}

              {/* Actions per status */}
              {(() => {
                const PENDING_WINDOW_MS = 180 * 1000
                const isPendingCreation = p.status === 'DRAFT' &&
                  !!p.createdAt &&
                  Date.now() - new Date(p.createdAt).getTime() < PENDING_WINDOW_MS
                return (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/property/${p.id}`)}
                      className="btn-outline-pop text-xs"
                    >
                      View
                    </button>

                    {isPendingCreation && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Indexing... please wait
                      </span>
                    )}

                    {p.status === 'DRAFT' && !isPendingCreation && (
                      <button
                        onClick={() => setPreflightTarget({ property: p, action: 'register' })}
                        disabled={!!(actionLoading && actionLoading.startsWith(p.id))}
                        className="btn-candy text-xs"
                      >
                        {actionLoading === p.id + '-register' ? 'Registering…'
                          : actionLoading === p.id + '-waiting' ? 'Mining (1/3)…'
                            : actionLoading === p.id + '-approving' ? 'Approving (2/3)…'
                              : actionLoading === p.id + '-minting' ? 'Tokenizing (3/3)…'
                                : 'Register On-Chain'}
                      </button>
                    )}

                    {p.status === 'REGISTERED' && (
                      <button
                        onClick={() => setPreflightTarget({ property: p, action: 'mint' })}
                        disabled={!!(actionLoading && actionLoading.startsWith(p.id))}
                        className="btn-candy text-xs"
                      >
                        {actionLoading === p.id + '-approving' ? 'Approving…'
                          : actionLoading === p.id + '-minting' ? 'Tokenizing…'
                            : 'Tokenize Asset'}
                      </button>
                    )}

                    {p.status === 'TOKEN_LIVE' && (
                      <>
                        <button
                          onClick={() => setYieldDialogProperty(p)}
                          disabled={!!actionLoading}
                          className="btn-candy text-xs flex items-center gap-1"
                        >
                          <DollarSign className="h-3 w-3" />
                          Distribute Dividend
                        </button>
                        <button
                          onClick={() => setReportModalProperty(p)}
                          disabled={!!actionLoading}
                          className="btn-outline-pop text-xs flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          Submit Report
                        </button>
                      </>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        ))}
      </div>

      {yieldDialogProperty && (
        <YieldReportDialog
          property={yieldDialogProperty}
          onClose={() => setYieldDialogProperty(null)}
          onSuccess={() => {
            setYieldDialogProperty(null)
            onRefresh()
          }}
        />
      )}

      {reportModalProperty && (
        <ReportModal
          propertyId={reportModalProperty.id}
          onClose={() => setReportModalProperty(null)}
          onSuccess={() => setReportModalProperty(null)}
        />
      )}

      {/* Pre-flight Requirements Check */}
      {preflightTarget && (
        <PreflightCheckModal
          property={preflightTarget.property}
          onProceed={() => {
            const { property, action } = preflightTarget
            setPreflightTarget(null)
            if (action === 'register') handleRegisterOnChain(property)
            else handleMintPrincipleOnChain(property)
          }}
          onCancel={() => setPreflightTarget(null)}
        />
      )}

      {/* Gas Estimation Pre-flight Dialog */}
      {gasEstimate && (
        <GasEstimationPreview
          estimate={gasEstimate}
          onConfirm={() => {
            if (pendingTxRef.current) pendingTxRef.current()
          }}
          onCancel={() => {
            const rej = (pendingTxRef as any)._reject
            if (rej) rej()
          }}
        />
      )}
    </div>
  )
}

// ─── Shared Components ────────────────────────────────────────────────────────

function PropertySidebar({
  properties,
  selectedId,
  onSelect
}: {
  properties: ApiProperty[],
  selectedId: string,
  onSelect: (id: string) => void
}) {
  return (
    <div className="md:w-1/3 lg:w-[30%] space-y-3 flex-shrink-0">
      {properties.map(p => (
        <div
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`cursor-pointer rounded-xl border-2 p-3 transition-colors flex items-center gap-3 ${selectedId === p.id
            ? 'border-primary bg-primary/5'
            : 'border-foreground/10 bg-card hover:border-foreground/30'
            }`}
        >
          {p.thumbnailDocument?.url ? (
            <img src={p.thumbnailDocument.url} alt={p.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted shrink-0">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-heading font-bold text-sm truncate">{p.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{p.address}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Reports ─────────────────────────────────────────────────────────────

function ReportsTab({ properties }: { properties: ApiProperty[] }) {
  const [selectedProperty, setSelectedProperty] = useState<string>(properties[0]?.id ?? '')
  const [reports, setReports] = useState<ApiReport[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!selectedProperty) return
    setLoadingReports(true)
    listReports(selectedProperty)
      .then((r) => setReports(unwrapArray<ApiReport>(r)))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false))
  }, [selectedProperty])

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-foreground/20 py-12 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
        <p className="text-sm font-semibold">No properties available for reports.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <PropertySidebar properties={properties} selectedId={selectedProperty} onSelect={setSelectedProperty} />

      <div className="md:w-2/3 lg:w-[70%] space-y-5 rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold">Reports</h2>
          <button onClick={() => setShowModal(true)} className="btn-candy flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> Submit Report
          </button>
        </div>

        {loadingReports ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border-2 border-foreground/10 bg-muted" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-foreground/20 py-12 text-center bg-background/50">
            <FileText className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
            <p className="text-sm text-muted-foreground">No reports submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="rounded-xl border-2 border-foreground/10 p-4 space-y-1 bg-background hover:border-primary/50 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-sm">
                    {r.reportPeriodStart} → {r.reportPeriodEnd}
                  </span>
                  {r.onChainTxHash && (
                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px] bg-muted px-2 py-0.5 rounded-full">
                      {r.onChainTxHash}
                    </span>
                  )}
                </div>
                {r.description && <p className="text-sm text-muted-foreground pt-1">{r.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && selectedProperty && (
        <ReportModal
          propertyId={selectedProperty}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            // Refresh
            listReports(selectedProperty).then((r) => setReports(unwrapArray<ApiReport>(r)))
          }}
        />
      )}
    </div>
  )
}

function ReportModal({
  propertyId,
  onClose,
  onSuccess,
}: {
  propertyId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [description, setDescription] = useState('')
  const [txHash, setTxHash] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('reportPeriodStart', start)
      form.append('reportPeriodEnd', end)
      if (description) form.append('description', description)
      if (txHash) form.append('onChainTxHash', txHash)
      if (file) form.append('file', file)
      await submitReport(propertyId, form)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop space-y-4">
        <h3 className="font-heading text-lg font-bold">Submit Report</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Period Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Period End</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            placeholder="Describe the report period…"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold">On-Chain Tx Hash (optional)</label>
          <input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
            placeholder="0x…"
          />
        </div>

        <DocumentDropzone
          label="Attach report document (optional)"
          file={file}
          onFile={setFile}
          onRemove={() => setFile(null)}
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-outline-pop flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-candy flex-1">
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Market Data ─────────────────────────────────────────────────────────

function MarketDataTab({ properties }: { properties: ApiProperty[] }) {
  const chainId = useChainId()
  const tokenizedProps = properties.filter(
    (p) => (p.status === 'TOKENIZED' || p.status === 'LISTED') && (p as any).tokenId
  )
  const [selectedProperty, setSelectedProperty] = useState<string>(tokenizedProps[0]?.id ?? '')
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null)
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [priceRange, setPriceRange] = useState<import('@/lib/apicall/market').PriceRange>('all')
  const [yieldHistory, setYieldHistory] = useState<YieldDistribution[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedProperty) return
    const prop = properties.find((p) => p.id === selectedProperty)
    const tokenId = (prop as any)?.tokenId
    if (!tokenId) return

    setLoading(true)
    Promise.allSettled([
      getMarketStats(tokenId.toString(), chainId.toString()),
      getPriceHistory(tokenId.toString(), chainId.toString()),
      getYieldHistory(selectedProperty),
    ]).then(([statsRes, histRes, yieldRes]) => {
      if (statsRes.status === 'fulfilled') setMarketStats(statsRes.value)
      else setMarketStats(null)
      if (histRes.status === 'fulfilled') setPriceHistory(unwrapArray<PricePoint>(histRes.value))
      if (yieldRes.status === 'fulfilled') setYieldHistory(unwrapArray<YieldDistribution>(yieldRes.value))
    }).finally(() => setLoading(false))
  }, [selectedProperty, properties])

  if (tokenizedProps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-foreground/20 py-16 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground" strokeWidth={1} />
        <div>
          <p className="font-heading font-bold">No tokenized properties</p>
          <p className="text-sm text-muted-foreground mt-1">
            Register and tokenize your property to see market data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <PropertySidebar properties={tokenizedProps} selectedId={selectedProperty} onSelect={setSelectedProperty} />

      <div className="md:w-2/3 lg:w-[70%] space-y-5">
        <h2 className="font-heading text-xl font-bold bg-card p-4 rounded-2xl border-2 border-foreground shadow-pop hidden md:block">
          Market Data
        </h2>

        {/* Market Stats Bar */}
        <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
          <h3 className="mb-4 font-heading font-bold">Market Stats</h3>
          <MarketStatsBar stats={marketStats} loading={loading} />
        </div>

        {/* Price Chart */}
        <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
          <h3 className="mb-4 font-heading font-bold">Price History</h3>
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
          ) : (
            <PriceChart data={priceHistory} range={priceRange} onRangeChange={setPriceRange} />
          )}
        </div>

        {/* Dividend Table */}
        <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop">
          <h3 className="mb-4 font-heading font-bold">Dividend Distributions</h3>
          {loading ? (
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          ) : (
            <DividendTable data={yieldHistory} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Yield History ───────────────────────────────────────────────────────

function YieldTab({ properties }: { properties: ApiProperty[] }) {
  const [selectedProperty, setSelectedProperty] = useState<string>(properties[0]?.id ?? '')
  const [history, setHistory] = useState<YieldDistribution[]>([])
  const [loading, setLoading] = useState(false)
  const [distributeDialogProp, setDistributeDialogProp] = useState<ApiProperty | null>(null)

  useEffect(() => {
    if (!selectedProperty) return
    setLoading(true)
    getYieldHistory(selectedProperty)
      .then((r) => setHistory(unwrapArray<YieldDistribution>(r)))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedProperty])

  const selectedPropObj = properties.find((p) => p.id === selectedProperty) ?? null
  const canDistribute = selectedPropObj?.status === 'TOKEN_LIVE'

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-foreground/20 py-12 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
        <p className="text-sm font-semibold">No properties available for yield history.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <PropertySidebar properties={properties} selectedId={selectedProperty} onSelect={setSelectedProperty} />

      <div className="md:w-2/3 lg:w-[70%] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border-2 border-foreground shadow-pop">
          <h2 className="font-heading text-xl font-bold">Yield History</h2>
          {canDistribute && (
            <button
              onClick={() => setDistributeDialogProp(selectedPropObj)}
              className="btn-candy flex items-center gap-2 text-sm"
            >
              <DollarSign className="h-4 w-4" /> Distribute Dividend
            </button>
          )}
        </div>

        {distributeDialogProp && (
          <YieldReportDialog
            property={distributeDialogProp}
            onClose={() => setDistributeDialogProp(null)}
            onSuccess={() => {
              setDistributeDialogProp(null)
              // Refresh history
              if (selectedProperty) {
                getYieldHistory(selectedProperty)
                  .then((r) => setHistory(unwrapArray<YieldDistribution>(r)))
                  .catch(() => { })
              }
            }}
          />
        )}

        {loading ? (
          <div className="h-48 animate-pulse rounded-xl border-2 border-foreground/10 bg-muted" />
        ) : (
          <>
            <div className="rounded-2xl border-2 border-foreground bg-card p-4 shadow-pop">
              <h3 className="mb-4 font-heading font-bold">Yield Distributions</h3>
              <YieldChart data={history} />
            </div>

            {history.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border-2 border-foreground bg-card shadow-pop">
                <table className="w-full text-sm">
                  <thead className="border-b-2 border-foreground bg-muted">
                    <tr>
                      {['Date', 'Total', 'Holder', 'Baseline', 'Platform', 'Tx Hash'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-bold text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-foreground/10">
                    {history.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 text-xs">
                          {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          ${(Number(d.totalAmount) / 1e6).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-primary">
                          ${(Number(d.holderAmount) / 1e6).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-tertiary">
                          ${(Number(d.baselineAmount) / 1e6).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          ${(Number(d.platformFee) / 1e6).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                          {d.txHash ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Transactions ────────────────────────────────────────────────────────

// ─── Pre-flight Check Modal ───────────────────────────────────────────────────

function ChecklistItem({
  label,
  ok,
  description,
  optional = false,
  children,
}: {
  label: string
  ok: boolean
  description: string
  optional?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border-2 p-4 space-y-2 ${ok
        ? 'border-primary/30 bg-primary/5'
        : optional
          ? 'border-amber-300 bg-amber-50'
          : 'border-destructive/30 bg-destructive/5'
        }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{ok ? '✅' : optional ? '⚠️' : '❌'}</span>
        <span className="font-semibold text-sm">{label}</span>
        {optional && <span className="ml-auto text-[10px] text-muted-foreground">optional</span>}
      </div>
      <p className="text-xs text-muted-foreground pl-6">{description}</p>
      {children && <div className="pl-0">{children}</div>}
    </div>
  )
}

function PreflightCheckModal({
  property,
  onProceed,
  onCancel,
}: {
  property: ApiProperty
  onProceed: () => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [currentSLA, setCurrentSLA] = useState<ApiSLA | null>(null)
  const [currentSub, setCurrentSub] = useState<{ plan: 'MONTHLY' | 'YIELD_PERCENTAGE' } | null>(null)

  // Editable form state
  const [plan, setPlan] = useState<'MONTHLY' | 'YIELD_PERCENTAGE'>('YIELD_PERCENTAGE')
  const [holderBPS, setHolderBPS] = useState(7000)
  const [baselineBPS, setBaselineBPS] = useState(2000)
  const [yieldDays, setYieldDays] = useState(30)
  const [reportDays, setReportDays] = useState(30)
  const [targetFund, setTargetFund] = useState(property.targetFundUSD ?? 500000)
  const [saleEndDate, setSaleEndDate] = useState(
    property.salePeriodEnd
      ? new Date(property.salePeriodEnd).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([getSLA(property.id), getSubscription(property.id)]).then(
      ([slaRes, subRes]) => {
        const sla = slaRes.status === 'fulfilled' ? slaRes.value : null
        const sub = subRes.status === 'fulfilled' ? subRes.value : null
        setCurrentSLA(sla)
        setCurrentSub(sub)
        if (sla) {
          setHolderBPS(sla.holderYieldBPS)
          setBaselineBPS(sla.baselineYieldBPS)
          setYieldDays(sla.yieldPeriodDays)
          setReportDays(sla.reportPeriodDays)
        }
        if (sub) setPlan(sub.plan)
        setLoading(false)
      }
    )
  }, [property.id])

  const platformBPS = plan === 'MONTHLY' ? 0 : 300
  const totalBPS = holderBPS + baselineBPS
  const maxBPS = 10000 - platformBPS
  const bpsValid = plan === 'MONTHLY' ? totalBPS === 10000 : totalBPS <= 9700

  const slaOk = !!currentSLA && bpsValid
  const subOk = !!currentSub
  const saleOk = !!(property.targetFundUSD && property.salePeriodEnd)

  const handleSaveAndProceed = async () => {
    setError(null)
    if (!bpsValid) {
      setError(
        plan === 'MONTHLY'
          ? `For MONTHLY plan, holder + baseline BPS must equal 10000 (currently ${totalBPS}).`
          : `For YIELD_PERCENTAGE plan, holder + baseline BPS cannot exceed 9700 (currently ${totalBPS}).`
      )
      return
    }
    setSaving(true)
    try {
      // Save subscription if missing or changed
      if (!currentSub || currentSub.plan !== plan) {
        await setSubscription(property.id, plan)
      }
      // Save SLA if missing or values changed
      if (
        !currentSLA ||
        currentSLA.holderYieldBPS !== holderBPS ||
        currentSLA.baselineYieldBPS !== baselineBPS ||
        currentSLA.yieldPeriodDays !== yieldDays ||
        currentSLA.reportPeriodDays !== reportDays
      ) {
        await setSLA(property.id, {
          holderYieldBPS: holderBPS,
          baselineYieldBPS: baselineBPS,
          yieldPeriodDays: yieldDays,
          reportPeriodDays: reportDays,
        })
      }
      // Update property optional fields if changed
      const updates: Record<string, unknown> = {}
      if (targetFund && targetFund !== property.targetFundUSD) updates.targetFundUSD = targetFund
      const salePeriodEndISO = saleEndDate ? new Date(saleEndDate).toISOString() : null
      if (salePeriodEndISO && salePeriodEndISO !== property.salePeriodEnd)
        updates.salePeriodEnd = salePeriodEndISO
      if (Object.keys(updates).length > 0) {
        await updateProperty(property.id, updates)
      }
      onProceed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl border-2 border-foreground bg-card p-8 shadow-pop">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="font-semibold">Checking requirements…</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop space-y-5 max-h-[90vh] overflow-y-auto">
        <div>
          <h3 className="font-heading text-xl font-bold">Pre-flight Check</h3>
          <p className="text-sm text-muted-foreground mt-1">
            All requirements must be met before spending gas on-chain.
          </p>
        </div>

        <div className="space-y-3">
          {/* Subscription plan */}
          <ChecklistItem
            label="Subscription Plan"
            ok={subOk}
            description={currentSub ? `Current: ${currentSub.plan}` : 'Not configured — select a plan below'}
          >
            <div className="mt-1 flex gap-2">
              {(['YIELD_PERCENTAGE', 'MONTHLY'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors ${plan === p
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-foreground/20 hover:border-foreground/40'
                    }`}
                >
                  {p === 'YIELD_PERCENTAGE' ? 'Yield % (3% fee)' : 'Monthly (flat fee)'}
                </button>
              ))}
            </div>
          </ChecklistItem>

          {/* SLA */}
          <ChecklistItem
            label="SLA Configuration"
            ok={slaOk}
            description={
              !currentSLA
                ? 'Not configured — fill in below'
                : !bpsValid
                  ? `BPS sum invalid (${totalBPS} / ${maxBPS} max) — fix below`
                  : `${currentSLA.holderYieldBPS / 100}% holder · ${currentSLA.baselineYieldBPS / 100}% baseline · ${currentSLA.yieldPeriodDays}d yield · ${currentSLA.reportPeriodDays}d report`
            }
          >
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold">Holder Yield (BPS)</label>
                  <input
                    type="number"
                    value={holderBPS}
                    onChange={(e) => setHolderBPS(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    min={0}
                    max={10000}
                  />
                  <p className="text-[10px] text-muted-foreground">{(holderBPS / 100).toFixed(2)}%</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold">Baseline Yield (BPS)</label>
                  <input
                    type="number"
                    value={baselineBPS}
                    onChange={(e) => setBaselineBPS(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    min={0}
                    max={10000}
                  />
                  <p className="text-[10px] text-muted-foreground">{(baselineBPS / 100).toFixed(2)}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold">Yield Period (days)</label>
                  <input
                    type="number"
                    value={yieldDays}
                    onChange={(e) => setYieldDays(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold">Report Period (days)</label>
                  <input
                    type="number"
                    value={reportDays}
                    onChange={(e) => setReportDays(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    min={1}
                  />
                </div>
              </div>
              <div
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${bpsValid ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                  }`}
              >
                Sum: {holderBPS} + {baselineBPS} = {totalBPS} BPS
                {plan === 'YIELD_PERCENTAGE'
                  ? ` · platform 300 BPS · max allowed: 9700`
                  : ` · must equal exactly 10000`}
              </div>
            </div>
          </ChecklistItem>

          {/* Token sale settings (optional) */}
          <ChecklistItem
            label="Token Sale Settings"
            ok={saleOk}
            optional
            description={
              saleOk
                ? `$${(property.targetFundUSD ?? 0).toLocaleString()} · ends ${new Date(property.salePeriodEnd!).toLocaleDateString()}`
                : 'Not set — defaults will be used ($500k · 30 days from now)'
            }
          >
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold">Target Fund (USD)</label>
                <input
                  type="number"
                  value={targetFund}
                  onChange={(e) => setTargetFund(Number(e.target.value))}
                  className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  min={1}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold">Sale End Date</label>
                <input
                  type="date"
                  value={saleEndDate}
                  onChange={(e) => setSaleEndDate(e.target.value)}
                  className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </ChecklistItem>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-outline-pop flex-1">
            Cancel
          </button>
          <button
            onClick={handleSaveAndProceed}
            disabled={saving || !bpsValid}
            className="btn-candy flex-1"
          >
            {saving ? 'Saving…' : !subOk || !slaOk ? 'Save & Proceed' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const TX_TYPE_LABEL: Record<string, string> = {
  REGISTER_PROPERTY: 'Register Property',
  DISTRIBUTE_YIELD: 'Distribute Yield',
}

const TX_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  FAILED: 'bg-red-100 text-red-800 border-red-300',
}

function TransactionsTab({ properties }: { properties: ApiProperty[] }) {
  const [selectedProperty, setSelectedProperty] = useState<string>(properties[0]?.id ?? '')
  const [txs, setTxs] = useState<BlockchainTx[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedProperty) return
    setLoading(true)
    listTransactions(selectedProperty)
      .then((r) => setTxs(unwrapArray<BlockchainTx>(r)))
      .catch(() => setTxs([]))
      .finally(() => setLoading(false))
  }, [selectedProperty])

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-foreground/20 py-12 text-center">
        <Activity className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
        <p className="text-sm font-semibold">No properties available for transactions.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <PropertySidebar properties={properties} selectedId={selectedProperty} onSelect={setSelectedProperty} />

      <div className="md:w-2/3 lg:w-[70%] space-y-5 rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop">
        <h2 className="font-heading text-xl font-bold">On-Chain Transactions</h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl border-2 border-foreground/10 bg-muted" />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-foreground/20 py-12 text-center bg-background/50">
            <Activity className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
            <p className="text-sm text-muted-foreground">No on-chain transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border-2 border-foreground/10">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-foreground/10 bg-muted text-muted-foreground">
                <tr>
                  {['Date', 'Type', 'Tx Hash', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-xs tracking-wider uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-foreground/5 bg-background">
                {txs.map((tx) => {
                  const explorerUrl = tx.chain?.blockExplorerUrl ?? 'https://base-sepolia.blockscout.com'
                  return (
                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-foreground">
                        {TX_TYPE_LABEL[tx.type] ?? tx.type}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <a
                          href={`${explorerUrl}/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline group"
                        >
                          <span className="max-w-[160px] truncate">{tx.txHash}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TX_STATUS_STYLE[tx.status] ?? ''}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
