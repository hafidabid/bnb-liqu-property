import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Zap, RotateCcw, Save, Info } from 'lucide-react'
import { useGasSettings, type GasSettings } from '@/hooks/useGasSettings'
import { useGasPrice } from '@/hooks/useGasPrice'

interface GasSettingsDialogProps {
  onClose: () => void
}

export function GasSettingsDialog({ onClose }: GasSettingsDialogProps) {
  const { settings, saveSettings, resetSettings } = useGasSettings()
  const liveGwei = useGasPrice() // shared singleton — no extra RPC calls

  const [form, setForm] = useState<GasSettings>({ ...settings })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveSettings(form)
    setSaved(true)
    setTimeout(() => {
        setSaved(false)
        onClose()
    }, 1500)
  }

  const handleReset = () => {
    resetSettings()
    setForm({ gasPriceGwei: '', gasLimitMultiplier: '1.3' })
  }

  const multiplierNum = parseFloat(form.gasLimitMultiplier)
  const multiplierValid = !isNaN(multiplierNum) && multiplierNum >= 1.0 && multiplierNum <= 3.0

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center p-4 pt-20 pb-8">
      <div className="w-full max-w-sm rounded-2xl border-2 border-foreground bg-card shadow-pop space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-foreground bg-amber-400 shadow-pop">
              <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <h2 className="font-heading text-base font-extrabold">Gas Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-foreground/20 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Live gas info */}
        <div className="rounded-xl border-2 border-foreground/10 bg-muted/50 px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Live Network Gas Price</span>
          <span className="font-mono text-sm font-bold text-foreground">
            {liveGwei ? `${liveGwei} Gwei` : <span className="animate-pulse text-muted-foreground">—</span>}
          </span>
        </div>

        {/* Gas Price Override */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center gap-1.5">
            Gas Price Override (Gwei)
            <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground font-normal">optional</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder={liveGwei ? `Auto (${liveGwei} Gwei)` : 'Auto'}
            value={form.gasPriceGwei}
            onChange={(e) => setForm((f) => ({ ...f, gasPriceGwei: e.target.value }))}
            className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
          />
          <p className="text-[11px] text-muted-foreground flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            Leave blank to let your wallet determine the gas price automatically.
          </p>
        </div>

        {/* Gas Limit Multiplier */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center gap-1.5">
            Gas Limit Multiplier
            <span className="rounded border border-foreground/20 bg-background px-1.5 py-0.5 text-[10px] font-mono text-foreground">
              {multiplierValid ? `${multiplierNum.toFixed(2)}×` : '—'}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.05"
              value={form.gasLimitMultiplier}
              onChange={(e) => setForm((f) => ({ ...f, gasLimitMultiplier: e.target.value }))}
              className="flex-1 accent-primary"
            />
            <input
              type="number"
              min="1.0"
              max="3.0"
              step="0.05"
              value={form.gasLimitMultiplier}
              onChange={(e) => setForm((f) => ({ ...f, gasLimitMultiplier: e.target.value }))}
              className="w-20 rounded-lg border-2 border-foreground/20 bg-background px-2 py-1.5 text-sm font-mono text-center focus:border-primary focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            Estimated gas × multiplier = gas limit sent to chain. 1.3× is a safe default.
          </p>
          {!multiplierValid && (
            <p className="text-[11px] text-destructive">Must be between 1.0 and 3.0</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border-2 border-foreground/20 px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={2.5} />
            Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!multiplierValid}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-foreground bg-primary px-3 py-2 text-xs font-bold text-white shadow-pop transition-all hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-active disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-3 w-3" strokeWidth={2.5} />
            {saved ? 'Saved ✓' : 'Save Settings'}
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
