import { Fuel, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatUnits } from 'viem'

export type GasEstimate = {
  /** Human-readable label for the action, e.g. "Register Property" */
  actionLabel: string
  /** Raw estimated gas units from estimateContractGas */
  estimatedGas: bigint
  /** Gas limit that will be sent: estimatedGas × multiplier */
  gasLimit: bigint
  /** Gas price in wei; undefined = wallet/network auto */
  gasPriceWei: bigint | undefined
  /** The multiplier applied, e.g. 1.3 */
  multiplier: number
}

interface GasEstimationPreviewProps {
  estimate: GasEstimate
  onConfirm: () => void
  onCancel: () => void
}

function formatEth(wei: bigint): string {
  const eth = parseFloat(formatUnits(wei, 18))
  if (eth === 0) return '0 ETH'
  if (eth < 0.000001) return `< 0.000001 ETH`
  return `${eth.toFixed(8)} ETH`
}

function formatGwei(wei: bigint): string {
  return `${parseFloat(formatUnits(wei, 9)).toFixed(4)} Gwei`
}

export function GasEstimationPreview({
  estimate,
  onConfirm,
  onCancel,
}: GasEstimationPreviewProps) {
  const { actionLabel, estimatedGas, gasLimit, gasPriceWei, multiplier } = estimate

  // estimated fee = gasLimit × gasPrice (only if we have gasPriceWei)
  const estimatedFeeWei = gasPriceWei != null ? gasLimit * gasPriceWei : null

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Action', value: actionLabel },
    { label: 'Estimated Gas Units', value: estimatedGas.toLocaleString(), mono: true },
    {
      label: 'Gas Limit',
      value: `${gasLimit.toLocaleString()} (${multiplier.toFixed(2)}× estimate)`,
      mono: true,
    },
    {
      label: 'Gas Price',
      value: gasPriceWei != null ? formatGwei(gasPriceWei) : 'Auto (wallet default)',
      mono: true,
    },
  ]

  if (estimatedFeeWei != null) {
    rows.push({ label: 'Est. Max Fee', value: formatEth(estimatedFeeWei), mono: true })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border-2 border-foreground bg-card shadow-pop space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-foreground bg-amber-400 shadow-pop">
              <Fuel className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <h2 className="font-heading text-base font-extrabold">Gas Estimation</h2>
          </div>
          <button
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-foreground/20 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Estimation table */}
        <div className="rounded-xl border-2 border-foreground/10 bg-muted/40 divide-y divide-foreground/10 overflow-hidden">
          {rows.map(({ label, value, mono }) => (
            <div key={label} className="flex items-center justify-between px-3 py-2.5 gap-2">
              <span className="text-xs text-muted-foreground shrink-0">{label}</span>
              <span className={`text-xs font-semibold text-right break-all ${mono ? 'font-mono' : ''}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" strokeWidth={2.5} />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
            Actual gas used may vary. The gas limit above ensures your transaction won't run out of gas.
            {gasPriceWei == null && ' Fee shown by your wallet may differ from estimated.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border-2 border-foreground/20 px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-foreground bg-primary px-3 py-2.5 text-sm font-bold text-white shadow-pop transition-all hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-active"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
            Confirm & Sign
          </button>
        </div>
      </div>
    </div>
  )
}
