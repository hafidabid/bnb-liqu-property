import { useState, useEffect } from 'react'
import { useWalletClient, useChainId, usePublicClient } from 'wagmi'
import { DollarSign, FileText, X, CheckCircle2, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'
import { DocumentDropzone } from './DocumentDropzone'
import {
  getSLA,
  submitYieldAndReport,
  listTransactions,
  uploadDocument,
  type ApiProperty,
  type ApiSLA,
  type BlockchainTx,
} from '@/lib/apicall/property'
import { loadContractAddresses } from '@/lib/apicall/chains'
import { PrincipleTokenABI, MockUSDABI } from '@/lib/abis'

interface YieldReportDialogProps {
  property: ApiProperty
  onClose: () => void
  onSuccess: () => void
}

export function YieldReportDialog({ property, onClose, onSuccess }: YieldReportDialogProps) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()

  // SLA
  const [sla, setSla] = useState<ApiSLA | null>(null)
  const [slaLoading, setSlaLoading] = useState(true)

  // Yield section
  const [yieldAmountUSD, setYieldAmountUSD] = useState('')
  const [yieldTxPhase, setYieldTxPhase] = useState<'idle' | 'creating' | 'signing' | 'done'>('idle')
  const [yieldTxHash, setYieldTxHash] = useState<string | null>(null)
  const [yieldTxError, setYieldTxError] = useState<string | null>(null)

  // Report section
  const [reportStart, setReportStart] = useState('')
  const [reportEnd, setReportEnd] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [reportFile, setReportFile] = useState<File | null>(null)

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<{ yieldTxHash?: string; reportId?: string } | null>(null)
  const [latestTx, setLatestTx] = useState<BlockchainTx | null>(null)

  useEffect(() => {
    setSlaLoading(true)
    getSLA(property.id)
      .then((r) => setSla(r))
      .catch(() => setSla(null))
      .finally(() => setSlaLoading(false))
  }, [property.id])

  const holderBPS = sla?.holderYieldBPS ?? 7000
  const baselineBPS = sla?.baselineYieldBPS ?? 2000
  const platformBPS = sla?.platformFeeBPS ?? (10000 - holderBPS - baselineBPS)

  const rawAmount = yieldAmountUSD ? Math.round(parseFloat(yieldAmountUSD) * 1e6) : 0
  const holderAmount = Math.floor((rawAmount * holderBPS) / 10000)
  const baselineAmount = Math.floor((rawAmount * baselineBPS) / 10000)
  const platformFeeAmount = rawAmount - holderAmount - baselineAmount

  const hasYield = !!yieldAmountUSD && rawAmount > 0
  const hasReport = !!(reportStart && reportEnd)

  const handleSignYield = async () => {
    if (!walletClient || !publicClient || !hasYield) return
    setYieldTxError(null)
    setYieldTxPhase('creating')
    try {
      const tokenId = property.tokenId ? BigInt(property.tokenId) : null
      if (!tokenId) throw new Error('Property tokenId not found.')

      // 1. Load contracts
      const contracts = await loadContractAddresses(chainId)
      const ptAddress = contracts['CH_PT']
      const usdcAddress = contracts['CH_USDC'] // or 'CH_SETTLEMENT'

      if (!ptAddress || !usdcAddress) {
        throw new Error('Required contract addresses (CH_PT or CH_USDC) not found for this chain.')
      }

      // 2. Approve USDC for PT contract
      setYieldTxPhase('signing') // Use 'signing' for the whole flow

      const approveHash = await walletClient.writeContract({
        address: usdcAddress,
        abi: MockUSDABI,
        functionName: 'approve',
        args: [ptAddress, BigInt(rawAmount)],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveHash })

      // 3. Distribute Yield
      const yieldHash = await walletClient.writeContract({
        address: ptAddress,
        abi: PrincipleTokenABI,
        functionName: 'distributeYield',
        args: [tokenId, BigInt(rawAmount)],
      })

      setYieldTxHash(yieldHash)
      setYieldTxPhase('done')
    } catch (e) {
      console.error('Yield distribution failed:', e)
      setYieldTxError(e instanceof Error ? e.message : 'Failed to send transaction')
      setYieldTxPhase('idle')
    }
  }

  const handleSubmit = async () => {
    if (!hasYield && !hasReport) return
    if (hasYield && !yieldTxHash) {
      setSubmitError('Please send the yield transaction first.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      // If submitting a report, call acknowledgeReport on-chain first
      if (hasReport && walletClient && publicClient) {
        const tokenId = property.tokenId ? BigInt(property.tokenId) : null
        if (!tokenId) throw new Error('Property tokenId not found.')
        const contracts = await loadContractAddresses(chainId)
        const ptAddress = contracts['CH_PT']
        if (!ptAddress) throw new Error('Contract address not found for this chain.')
        const ackHash = await walletClient.writeContract({
          address: ptAddress,
          abi: PrincipleTokenABI,
          functionName: 'acknowledgeReport',
          args: [tokenId],
        })
        await publicClient.waitForTransactionReceipt({ hash: ackHash })
      }

      let reportDocumentId: string | undefined

      // Upload report file first if provided
      if (reportFile && hasReport) {
        const doc = await uploadDocument(property.id, reportFile, 'PROSPECTUS')
        reportDocumentId = doc.id
      }

      const body: Record<string, string | undefined> = {}

      if (hasYield && yieldTxHash) {
        body.yieldTxHash = yieldTxHash
        body.totalAmount = rawAmount.toString()
        body.holderAmount = holderAmount.toString()
        body.baselineAmount = baselineAmount.toString()
        body.platformFee = platformFeeAmount.toString()
      }

      if (hasReport) {
        body.reportPeriodStart = reportStart
        body.reportPeriodEnd = reportEnd
        if (reportDescription) body.reportDescription = reportDescription
        if (reportDocumentId) body.reportDocumentId = reportDocumentId
      }

      const result = await submitYieldAndReport(property.id, body, chainId.toString())
      setSuccessResult(result)
      // Fetch latest tx to get the dynamic explorer URL
      listTransactions(property.id)
        .then(txs => setLatestTx(txs[0] ?? null))
        .catch(() => { })
      onSuccess()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (successResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
            <h3 className="font-heading text-lg font-bold">Success!</h3>
          </div>
          {successResult.yieldTxHash && (
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Yield Tx Hash</p>
              <p className="font-mono text-xs truncate">{successResult.yieldTxHash}</p>
              <a
                href={`${latestTx?.chain?.blockExplorerUrl ?? 'https://base-sepolia.blockscout.com'}/tx/${successResult.yieldTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {successResult.reportId && (
            <div className="rounded-lg border-2 border-foreground/10 p-3">
              <p className="text-sm font-semibold">Report submitted successfully.</p>
              <p className="text-xs text-muted-foreground">ID: {successResult.reportId}</p>
            </div>
          )}
          <button onClick={onClose} className="btn-candy w-full">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold">Yield & Report</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">{property.name}</span> — Fill in yield amount, report period, or both.
        </p>

        {/* ─── Yield Section ───────────────────────────────────── */}
        <div className="rounded-xl border-2 border-foreground/10 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" strokeWidth={2.5} />
            <h4 className="font-semibold">Yield Distribution <span className="text-xs font-normal text-muted-foreground">(optional)</span></h4>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold">Amount (USDC)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={yieldAmountUSD}
                onChange={(e) => {
                  setYieldAmountUSD(e.target.value)
                  setYieldTxHash(null)
                  setYieldTxPhase('idle')
                }}
                className="w-full rounded-lg border-2 border-foreground/20 bg-background py-2 pl-7 pr-3 text-sm focus:border-primary focus:outline-none"
                placeholder="e.g. 1500.00"
              />
            </div>
          </div>

          {/* SLA Breakdown */}
          {hasYield && (
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 space-y-2">
              {slaLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading SLA…
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground">Yield Breakdown</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <div className="font-bold text-primary">{(holderBPS / 100).toFixed(1)}%</div>
                      <div className="text-muted-foreground">Holders</div>
                      <div className="font-semibold">${(holderAmount / 1e6).toFixed(2)}</div>
                    </div>
                    <div className="rounded-lg bg-tertiary/10 p-2">
                      <div className="font-bold text-tertiary">{(baselineBPS / 100).toFixed(1)}%</div>
                      <div className="text-muted-foreground">Baseline</div>
                      <div className="font-semibold">${(baselineAmount / 1e6).toFixed(2)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-2">
                      <div className="font-bold">{(platformBPS / 100).toFixed(1)}%</div>
                      <div className="text-muted-foreground">Platform</div>
                      <div className="font-semibold">${(platformFeeAmount / 1e6).toFixed(2)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sign button */}
          {hasYield && (
            <div className="space-y-2">
              {yieldTxPhase === 'done' ? (
                <div className="flex items-center gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-2 text-xs text-primary font-semibold">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> Transaction sent
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSignYield}
                  disabled={yieldTxPhase !== 'idle' || !walletClient}
                  className="btn-candy w-full flex items-center justify-center gap-2 text-sm"
                >
                  {yieldTxPhase === 'creating' && <><Loader2 className="h-4 w-4 animate-spin" /> Creating tx…</>}
                  {yieldTxPhase === 'signing' && <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for signature…</>}
                  {yieldTxPhase === 'idle' && 'Send Yield Transaction'}
                </button>
              )}
              {yieldTxError && (
                <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  {yieldTxError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Report Section ──────────────────────────────────── */}
        <div className="rounded-xl border-2 border-foreground/10 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-tertiary" strokeWidth={2.5} />
            <h4 className="font-semibold">Report <span className="text-xs font-normal text-muted-foreground">(optional)</span></h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Period Start</label>
              <input
                type="date"
                value={reportStart}
                onChange={(e) => setReportStart(e.target.value)}
                className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Period End</label>
              <input
                type="date"
                value={reportEnd}
                onChange={(e) => setReportEnd(e.target.value)}
                className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="Describe the reporting period…"
            />
          </div>

          <DocumentDropzone
            label="Attach report document (optional)"
            file={reportFile}
            onFile={setReportFile}
            onRemove={() => setReportFile(null)}
          />
        </div>

        {submitError && (
          <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            {submitError}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-outline-pop flex-1">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (!hasYield && !hasReport)}
            className="btn-candy flex-1 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
