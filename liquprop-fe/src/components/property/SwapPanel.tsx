import { useState } from 'react'
import { useAccount, useWriteContract, usePublicClient, useReadContract, useChainId } from 'wagmi'
import { parseUnits } from 'viem'
import { Loader2, ArrowDownUp, AlertCircle, CheckCircle2 } from 'lucide-react'

import { SwapRouterPTABI } from '@/lib/abis/SwapRouterPTABI'
import { useGasSettings } from '@/hooks/useGasSettings'
import { submitSwapTx } from '@/lib/apicall/property'

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
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const

const USDC_DECIMALS = 6
const YIELD_TOKEN_DECIMALS = 18

interface SwapPanelProps {
  propertyId: string
  yieldTokenAddress: string
  usdcAddress: string
  swapRouterAddress: string
}

type Tab = 'buy' | 'sell'

export function SwapPanel({ propertyId, yieldTokenAddress, usdcAddress, swapRouterAddress }: SwapPanelProps) {
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

  const { data: tokenName } = useReadContract({
    address: yieldTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'name',
    query: { enabled: !!yieldTokenAddress },
  })
  const { data: tokenSymbol } = useReadContract({
    address: yieldTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: { enabled: !!yieldTokenAddress },
  })

  const displaySymbol = tokenSymbol ?? 'Token'

  const isBusy = isApproving || isSwapping
  const canSubmit = amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0 && !isBusy && !success && isConnected

  const handleSwap = async () => {
    if (!canSubmit || !address) return
    setErrorMsg(null)

    const isBuy = tab === 'buy'
    // zeroForOne=true  → sell yieldToken (token0) for USDC (token1)
    // zeroForOne=false → buy  yieldToken (token0) with USDC (token1)
    const zeroForOne = !isBuy
    const inputDecimals = isBuy ? USDC_DECIMALS : YIELD_TOKEN_DECIMALS
    const inputTokenAddress = isBuy ? usdcAddress : yieldTokenAddress

    let amountIn: bigint
    try {
      amountIn = parseUnits(amount, inputDecimals)
    } catch {
      setErrorMsg('Invalid amount.')
      return
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 5 * 60)

    try {
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
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [swapRouterAddress as `0x${string}`, amountIn],
            account: address,
          })
          if (estimated) approveGas = applyMultiplier(estimated)
        } catch { /* let wallet estimate */ }

        const approveTx = await writeApprove({
          address: inputTokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [swapRouterAddress as `0x${string}`, amountIn],
          gas: approveGas,
          gasPrice: getGasPriceWei(),
        })
        await publicClient?.waitForTransactionReceipt({ hash: approveTx })
      }

      setIsApproving(false)
      setIsSwapping(true)

      let swapGas: bigint | undefined
      try {
        const estimated = await publicClient?.estimateContractGas({
          address: swapRouterAddress as `0x${string}`,
          abi: SwapRouterPTABI,
          functionName: 'swap',
          args: [{ token0: yieldTokenAddress as `0x${string}`, zeroForOne, amountIn, amountOut: 0n, deadline }],
          account: address,
        })
        if (estimated) swapGas = applyMultiplier(estimated)
      } catch { /* let wallet estimate */ }

      const swapTx = await writeSwap({
        address: swapRouterAddress as `0x${string}`,
        abi: SwapRouterPTABI,
        functionName: 'swap',
        args: [{ token0: yieldTokenAddress as `0x${string}`, zeroForOne, amountIn, amountOut: 0n, deadline }],
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
      setErrorMsg(msg.includes('User rejected') ? 'Transaction rejected.' : msg.slice(0, 120))
    } finally {
      setIsApproving(false)
      setIsSwapping(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <p className="font-heading font-bold">Swap Successful!</p>
        <button
          onClick={() => { setSuccess(false); setAmount('') }}
          className="text-sm text-muted-foreground underline underline-offset-2"
        >
          Swap again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Token info */}
      {tokenName && tokenSymbol && (
        <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Trading <span className="font-bold text-foreground">{tokenName}</span>{' '}
          <span className="font-mono text-tertiary">({tokenSymbol})</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl border-2 border-foreground overflow-hidden">
        {(['buy', 'sell'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setAmount(''); setErrorMsg(null) }}
            disabled={isBusy}
            className={`flex-1 py-2 text-sm font-bold transition-colors ${tab === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {t === 'buy' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          {tab === 'buy' ? 'USDC to spend' : `${displaySymbol} to sell`}
        </label>
        <input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          disabled={isBusy}
          placeholder={tab === 'buy' ? '0.00 USDC' : `0 ${displaySymbol}`}
          className="w-full rounded-xl border-2 border-foreground bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary focus:shadow-[2px_2px_0px_0px] focus:shadow-primary disabled:opacity-50"
        />
      </div>

      {/* Direction hint */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowDownUp className="h-3.5 w-3.5 shrink-0" />
        {tab === 'buy' ? `USDC → ${displaySymbol}` : `${displaySymbol} → USDC`}
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSwap}
        disabled={!canSubmit}
        className="btn-candy w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isBusy ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isApproving ? 'Approving…' : 'Swapping…'}
          </span>
        ) : tab === 'buy' ? `Buy ${displaySymbol}` : `Sell ${displaySymbol}`}
      </button>
    </div>
  )
}
