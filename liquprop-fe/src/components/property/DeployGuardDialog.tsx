import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useWriteContract, useChainId } from 'wagmi'
import { X, Loader2, Rocket, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Zap } from 'lucide-react'

import { PrincipleTokenABI } from '@/lib/abis/PrincipleTokenABI'
import { useGasSettings } from '@/hooks/useGasSettings'
import { useGasPrice } from '@/hooks/useGasPrice'
import { priceToSqrtPriceX96 } from '@/lib/deployGuard/PriceMath'

import { submitDeployGuardTx } from '@/lib/apicall/property'

const FLOOR_TICK = -277320
// deployGuard: YieldToken deploys + PrincipleGuard deploy + Uniswap pool creation + 3 LP mints
// Actual gas used: ~4-6M. Estimation is SKIPPED because eth_estimateGas itself fails on Base Sepolia
// (simulation hits the node's call gas cap). Providing gas directly bypasses wagmi's auto-estimate.
const DEFAULT_GAS = 8_000_000n

interface DeployGuardDialogProps {
  isOpen: boolean
  onClose: () => void
  tokenId: string
  propertyId: string
  propertyName: string
  presalePrice: bigint
  principleTokenAddress: string
  onSuccess?: () => void
}

export function DeployGuardDialog({
  isOpen,
  onClose,
  tokenId,
  propertyId,
  propertyName,
  presalePrice,
  principleTokenAddress,
  onSuccess,
}: DeployGuardDialogProps) {
  const { address: _address, isConnected } = useAccount()
  const chainId = useChainId()
  const { settings, saveSettings, getGasPriceWei } = useGasSettings()
  const liveGwei = useGasPrice()

  const [name, setName] = useState(propertyName)
  const [symbol, setSymbol] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Gas settings panel state
  const [showGas, setShowGas] = useState(false)
  const [gasLimitOverride, setGasLimitOverride] = useState('')
  const [gasPriceOverride, setGasPriceOverride] = useState(settings.gasPriceGwei)
  const [multiplierOverride, setMultiplierOverride] = useState(settings.gasLimitMultiplier)

  const { writeContractAsync: writeDeploy } = useWriteContract()

  const sqrtPriceX96 = useMemo(() => {
    if (!presalePrice || presalePrice === 0n) return 0n
    return priceToSqrtPriceX96(presalePrice, 18)
  }, [presalePrice])

  if (!isOpen || !isConnected) return null

  const canSubmit = name.trim().length > 0 && symbol.trim().length > 0 && !isDeploying && !success

  const resolveGasPrice = (): bigint | undefined => {
    const gwei = parseFloat(gasPriceOverride)
    if (!gwei || isNaN(gwei) || gwei <= 0) return getGasPriceWei()
    return BigInt(Math.round(gwei * 1e9))
  }

  const handleDeploy = async () => {
    if (!canSubmit) return
    setErrorMsg(null)

    try {
      setIsDeploying(true)

      // --- Resolve gas limit ---
      // NOTE: We intentionally SKIP eth_estimateGas. On Base Sepolia the RPC node's
      // simulation cap is lower than the actual block gas limit, causing estimation
      // to always fail with "exceeds max transaction gas limit" even though the real
      // transaction only uses ~4-6M gas. Providing gas explicitly bypasses wagmi's
      // internal auto-estimate.
      let deployGas: bigint
      const manualLimit = parseInt(gasLimitOverride, 10)
      if (!isNaN(manualLimit) && manualLimit > 0) {
        deployGas = BigInt(manualLimit)
      } else {
        const multiplier = parseFloat(multiplierOverride) || 1.3
        deployGas = BigInt(Math.ceil(Number(DEFAULT_GAS) * multiplier))
      }

      const txHash = await writeDeploy({
        address: principleTokenAddress as `0x${string}`,
        abi: PrincipleTokenABI,
        functionName: 'deployGuard',
        args: [name.trim(), symbol.trim().toUpperCase(), BigInt(tokenId), sqrtPriceX96, FLOOR_TICK],
        gas: deployGas,
        gasPrice: resolveGasPrice(),
      })

      try {
        await submitDeployGuardTx(propertyId, txHash, chainId.toString())
      } catch (sumbitErr) {
        console.error('Failed to submit deploy guard tx to backend:', sumbitErr)
      }

      setIsDeploying(false)
      setSuccess(true)
      // Persist any gas setting changes the user made
      saveSettings({ gasPriceGwei: gasPriceOverride, gasLimitMultiplier: multiplierOverride })
      onSuccess?.()
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2500)
    } catch (err: any) {
      console.error(err)
      setIsDeploying(false)
      const raw: string = err?.shortMessage || err?.message || 'Unknown error occurred'
      const clean = raw.replace(/^.*?:\s*/, '').split('\n')[0]
      setErrorMsg(clean)
    }
  }

  const multiplierNum = parseFloat(multiplierOverride)
  const multiplierValid = !isNaN(multiplierNum) && multiplierNum >= 1.0 && multiplierNum <= 3.0

  // Show the effective gas limit the user will see in their wallet
  const manualLimit = parseInt(gasLimitOverride, 10)
  const displayGasLimit = !isNaN(manualLimit) && manualLimit > 0
    ? manualLimit.toLocaleString()
    : `${(Number(DEFAULT_GAS) * (multiplierValid ? multiplierNum : 1.3)).toLocaleString()} (default)`

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-pop-amber">

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-foreground bg-amber-400 px-6 py-4 text-foreground">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5" strokeWidth={2.5} />
            <h2 className="font-heading text-xl font-extrabold">Deploy Guard</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 opacity-70 transition-opacity hover:bg-black/10 hover:opacity-100"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            This deploys the yield token contract and opens secondary market trading on Uniswap V3.
            Initial price is set from the presale price.
          </p>

          <div className="space-y-3">
            <label className="text-sm font-bold text-foreground">Yield Token Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunset Villas Yield"
              className="w-full rounded-xl border-2 border-foreground bg-background px-4 py-3 text-sm font-medium shadow-pop-sm outline-none transition-transform focus:-translate-y-0.5"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-foreground">
              Yield Token Symbol <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. SVYLD"
              maxLength={10}
              className="w-full rounded-xl border-2 border-foreground bg-background px-4 py-3 font-mono text-lg font-bold shadow-pop-sm outline-none transition-transform focus:-translate-y-0.5"
            />
          </div>

          <div className="rounded-xl border-2 border-foreground/10 bg-muted p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Price</span>
              <span className="font-bold">${(Number(presalePrice) / 1e6).toFixed(4)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Floor Tick</span>
              <span className="font-mono font-bold">{FLOOR_TICK}</span>
            </div>
          </div>

          {/* ─── Gas Settings Panel ─────────────────────────────── */}
          <div className="rounded-xl border-2 border-foreground/20 overflow-hidden">
            <button
              onClick={() => setShowGas((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4 text-amber-500" strokeWidth={2.5} />
                Gas Settings
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  limit: {displayGasLimit}
                </span>
              </div>
              {showGas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showGas && (
              <div className="border-t-2 border-foreground/10 bg-muted/30 px-4 py-4 space-y-4">
                {/* Live gas price */}
                {liveGwei && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Live Network Gas</span>
                    <span className="font-mono font-bold">{liveGwei} Gwei</span>
                  </div>
                )}

                {/* Gas price override */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Gas Price Override (Gwei)
                    <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-normal text-muted-foreground">optional</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder={liveGwei ? `Auto (${liveGwei} Gwei)` : 'Auto'}
                    value={gasPriceOverride}
                    onChange={(e) => setGasPriceOverride(e.target.value)}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Gas limit multiplier */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Gas Limit Multiplier
                    <span className="rounded border border-foreground/20 bg-background px-1.5 py-0.5 text-[10px] font-mono">
                      {multiplierValid ? `${multiplierNum.toFixed(2)}×` : '—'}
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.05"
                      value={multiplierOverride}
                      onChange={(e) => setMultiplierOverride(e.target.value)}
                      className="flex-1 accent-amber-500"
                    />
                    <input
                      type="number"
                      min="1.0"
                      max="3.0"
                      step="0.05"
                      value={multiplierOverride}
                      onChange={(e) => setMultiplierOverride(e.target.value)}
                      className="w-20 rounded-lg border-2 border-foreground/20 bg-background px-2 py-1.5 text-sm font-mono text-center focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  {!multiplierValid && (
                    <p className="text-[11px] text-destructive">Must be between 1.0 and 3.0</p>
                  )}
                </div>

                {/* Manual gas limit override */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Manual Gas Limit
                    <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-normal text-muted-foreground">
                      overrides multiplier
                    </span>
                  </label>
                  <input
                    type="number"
                    min="100000"
                    step="100000"
                    placeholder={`Default: ${Number(DEFAULT_GAS).toLocaleString()}`}
                    value={gasLimitOverride}
                    onChange={(e) => setGasLimitOverride(e.target.value)}
                    className="w-full rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-sm font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    deployGuard creates a Uniswap V3 pool (~3–5M gas). If you get a gas limit error, set this to <strong>6000000</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {success && (
            <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
              <div>
                <p className="font-bold">Guard Deployed!</p>
                <p className="mt-0.5 font-medium opacity-80">Trading is now live on Uniswap V3.</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-3 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
              <div>
                <p className="font-bold">Transaction Failed</p>
                <p className="mt-0.5 font-medium opacity-80">{errorMsg}</p>
                {errorMsg.toLowerCase().includes('gas') && (
                  <p className="mt-1 text-[11px] opacity-70">
                    Try opening Gas Settings above and setting Manual Gas Limit to 6000000.
                  </p>
                )}
              </div>
              <button onClick={() => setErrorMsg(null)} className="ml-auto shrink-0 opacity-50 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleDeploy}
            disabled={!canSubmit || !multiplierValid}
            className="btn-candy w-full py-3 bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
          >
            {isDeploying ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Deploying...</>
            ) : (
              'Deploy Guard & Open Trading'
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
