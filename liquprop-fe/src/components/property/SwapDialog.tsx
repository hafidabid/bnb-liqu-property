import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useWriteContract, usePublicClient, useChainId } from 'wagmi'
import { parseUnits } from 'viem'
import { X, Loader2, ArrowDownUp, AlertCircle, CheckCircle2 } from 'lucide-react'

import { SwapRouterPTABI } from '@/lib/abis/SwapRouterPTABI'
import MockUSDABI from '@/lib/abis/MockUSDABI'
import { useGasSettings } from '@/hooks/useGasSettings'
import { submitSwapTx } from '@/lib/apicall/property'

// Minimal ERC20 ABI for approve + allowance on the yield token
const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

// USDC uses 6 decimals; yield token uses 18 (standard ERC20)
const USDC_DECIMALS = 6
const YIELD_TOKEN_DECIMALS = 18

interface SwapDialogProps {
  propertyId: string
  isOpen: boolean
  onClose: () => void
  yieldTokenAddress: string
  usdcAddress: string
  swapRouterAddress: string
  propertyName: string
}

type Tab = 'buy' | 'sell'

export function SwapDialog({
  propertyId,
  isOpen,
  onClose,
  yieldTokenAddress,
  usdcAddress,
  swapRouterAddress,
  propertyName,
}: SwapDialogProps) {
  const chainId = useChainId()
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { applyMultiplier, getGasPriceWei } = useGasSettings()

  const [tab, setTab] = useState<Tab>('buy')
  const [amount, setAmount] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { writeContractAsync: writeApprove } = useWriteContract()
  const { writeContractAsync: writeSwap } = useWriteContract()

  if (!isOpen || !isConnected) return null

  const isBusy = isApproving || isSwapping
  const canSubmit = amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0 && !isBusy && !success

  const handleSwap = async () => {
    if (!canSubmit || !address) return
    setErrorMsg(null)

    // Determine token being spent (input) and direction
    const isBuy = tab === 'buy'
    // zeroForOne=true  → sell yieldToken for USDC (token0 → token1)
    // zeroForOne=false → buy  yieldToken with USDC  (token1 → token0)
    const zeroForOne = !isBuy

    const inputDecimals = isBuy ? USDC_DECIMALS : YIELD_TOKEN_DECIMALS
    const inputTokenAddress = isBuy ? usdcAddress : yieldTokenAddress
    const inputAbi = isBuy ? MockUSDABI : ERC20_ABI

    let amountIn: bigint
    try {
      amountIn = parseUnits(amount, inputDecimals)
    } catch {
      setErrorMsg('Invalid amount.')
      return
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 5 * 60)

    try {
      // 1. Check allowance and approve if needed
      setIsApproving(true)

      const currentAllowance = await publicClient?.readContract({
        address: inputTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, swapRouterAddress as `0x${string}`],
      })

      if ((currentAllowance ?? 0n) < amountIn) {
        let approveGas: bigint | undefined
        try {
          const estimated = await publicClient?.estimateContractGas({
            address: inputTokenAddress as `0x${string}`,
            abi: inputAbi,
            functionName: 'approve',
            args: [swapRouterAddress as `0x${string}`, amountIn],
            account: address,
          })
          if (estimated) approveGas = applyMultiplier(estimated)
        } catch {
          // fall through — let wallet estimate
        }

        const approveTx = await writeApprove({
          address: inputTokenAddress as `0x${string}`,
          abi: inputAbi,
          functionName: 'approve',
          args: [swapRouterAddress as `0x${string}`, amountIn],
          gas: approveGas,
          gasPrice: getGasPriceWei(),
        })

        await publicClient?.waitForTransactionReceipt({ hash: approveTx })
      }

      setIsApproving(false)

      // 2. Execute swap
      setIsSwapping(true)

      let swapGas: bigint | undefined
      try {
        const estimated = await publicClient?.estimateContractGas({
          address: swapRouterAddress as `0x${string}`,
          abi: SwapRouterPTABI,
          functionName: 'swap',
          args: [{
            token0: yieldTokenAddress as `0x${string}`,
            zeroForOne,
            amountIn,
            amountOut: 0n, // no minimum output — accept any
            deadline,
          }],
          account: address,
        })
        if (estimated) swapGas = applyMultiplier(estimated)
      } catch {
        // fall through
      }

      const swapTx = await writeSwap({
        address: swapRouterAddress as `0x${string}`,
        abi: SwapRouterPTABI,
        functionName: 'swap',
        args: [{
          token0: yieldTokenAddress as `0x${string}`,
          zeroForOne,
          amountIn,
          amountOut: 0n,
          deadline,
        }],
        gas: swapGas,
        gasPrice: getGasPriceWei(),
      })

      await publicClient?.waitForTransactionReceipt({ hash: swapTx })

      let attempts = 0
      while (attempts < 5) {
        try {
          await submitSwapTx(propertyId, swapTx, chainId.toString())
          break
        } catch (e) {
          attempts++
          if (attempts >= 5) console.error('Failed to submit swap tx to backend after 5 attempts:', e)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
        }
      }

      setSuccess(true)
      window.location.reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const clean = msg.includes('User rejected') ? 'Transaction rejected.' : msg.slice(0, 120)
      setErrorMsg(clean)
    } finally {
      setIsApproving(false)
      setIsSwapping(false)
    }
  }

  const handleClose = () => {
    if (isBusy) return
    setAmount('')
    setErrorMsg(null)
    setSuccess(false)
    onClose()
  }

  const statusLabel = isApproving ? 'Approving…' : isSwapping ? 'Swapping…' : null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border-2 border-foreground bg-background p-6 shadow-pop">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl font-extrabold">Swap Tokens</h2>
            <p className="text-xs text-muted-foreground">{propertyName}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isBusy}
            className="rounded-full p-1 hover:bg-muted disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl border-2 border-foreground overflow-hidden">
          {(['buy', 'sell'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setAmount(''); setErrorMsg(null) }}
              disabled={isBusy || success}
              className={`flex-1 py-2 text-sm font-bold capitalize transition-colors ${tab === t
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {t === 'buy' ? 'Buy (USDC → Token)' : 'Sell (Token → USDC)'}
            </button>
          ))}
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="font-heading font-bold text-lg">Swap Successful!</p>
            <p className="text-sm text-muted-foreground">Your transaction has been confirmed.</p>
            <button onClick={handleClose} className="btn-candy mt-2 px-8">Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                {tab === 'buy' ? 'USDC to spend' : 'Tokens to sell'}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={isBusy}
                placeholder={tab === 'buy' ? '0.00 USDC' : '0 tokens'}
                className="w-full rounded-xl border-2 border-foreground bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:shadow-[2px_2px_0px_0px] focus:shadow-primary disabled:opacity-50"
              />
            </div>

            {/* Direction indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ArrowDownUp className="h-4 w-4" />
              <span>
                {tab === 'buy'
                  ? 'USDC → Yield Token (buy into pool)'
                  : 'Yield Token → USDC (sell from pool)'}
              </span>
            </div>

            {/* Slippage note */}
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              No minimum output is set — the swap will accept any amount out. Use caution with large orders.
            </p>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Status */}
            {statusLabel && (
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                {statusLabel}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSwap}
              disabled={!canSubmit}
              className="btn-candy w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {statusLabel}
                </span>
              ) : tab === 'buy' ? (
                'Buy Tokens'
              ) : (
                'Sell Tokens'
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
