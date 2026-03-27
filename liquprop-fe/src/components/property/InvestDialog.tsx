import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { parseUnits } from 'viem'
import { X, Loader2, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react'

import { useUSDCBalance } from '@/hooks/useUSDCBalance'
import MockUSDABI from '@/lib/abis/MockUSDABI'
import { PrincipleTokenABI } from '@/lib/abis/PrincipleTokenABI'
import { useGasSettings } from '@/hooks/useGasSettings'

interface InvestDialogProps {
  isOpen: boolean
  onClose: () => void
  tokenId: string
  propertyPrice: number
  principleTokenAddress: string
  onSuccess?: () => void
}

export function InvestDialog({
  isOpen,
  onClose,
  tokenId,
  propertyPrice,
  principleTokenAddress,
  onSuccess,
}: InvestDialogProps) {
  const { address, isConnected } = useAccount()
  const { balance, formatted: usdcFormatted, isLoading: isUsdcLoading, contractAddress: usdcAddress, refetch } = useUSDCBalance()

  const publicClient = usePublicClient()
  const { applyMultiplier, getGasPriceWei } = useGasSettings()

  const [buyAmount, setBuyAmount] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isBuying, setIsBuying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successTokens, setSuccessTokens] = useState<number | null>(null)

  const { data: approveTxHash, writeContractAsync: writeApprove } = useWriteContract()
  const { data: buyTxHash, writeContractAsync: writeBuy } = useWriteContract()

  useWaitForTransactionReceipt({
    hash: approveTxHash,
  })

  useWaitForTransactionReceipt({
    hash: buyTxHash,
  })

  if (!isOpen || !isConnected) return null

  const handleInvest = async () => {
    if (!buyAmount || isNaN(Number(buyAmount)) || Number(buyAmount) <= 0) return
    setErrorMsg(null)
    const numericTokens = Number(buyAmount)
    const totalUsdcCost = numericTokens * propertyPrice
    const totalUsdcRaw = parseUnits(totalUsdcCost.toString(), 6)

    if (balance && totalUsdcRaw > balance) {
      setErrorMsg('You do not have enough USDC for this transaction.')
      return
    }

    if (!usdcAddress) {
      setErrorMsg('Could not resolve USDC contract address.')
      return
    }

    try {
      // 1. Approve USDC
      setIsApproving(true)

      let approveGas: bigint | undefined
      try {
        const estimatedApproveGas = await publicClient?.estimateContractGas({
          address: usdcAddress as `0x${string}`,
          abi: MockUSDABI,
          functionName: 'approve',
          args: [principleTokenAddress as `0x${string}`, totalUsdcRaw],
          account: address,
        })
        if (estimatedApproveGas) {
          approveGas = applyMultiplier(estimatedApproveGas)
        }
      } catch (err) {
        console.warn("Gas estimation failed for approve", err)
      }

      await writeApprove({
        address: usdcAddress as `0x${string}`,
        abi: MockUSDABI,
        functionName: 'approve',
        args: [principleTokenAddress as `0x${string}`, totalUsdcRaw],
        gas: approveGas,
        gasPrice: getGasPriceWei(),
      })
      setIsApproving(false)

      // Wait a moment for UI to reflect, usually better to wait for receipt here but wagmi hooks handle polling
      setIsBuying(true)

      let buyGas: bigint | undefined
      const estimatedBuyGas = await publicClient?.estimateContractGas({
        address: principleTokenAddress as `0x${string}`,
        abi: PrincipleTokenABI,
        functionName: 'buyPresale',
        args: [BigInt(tokenId), BigInt(numericTokens)],
        account: address,
      })
      if (estimatedBuyGas) {
        buyGas = applyMultiplier(estimatedBuyGas)
      }

      // 2. Buy Presale
      await writeBuy({
        address: principleTokenAddress as `0x${string}`,
        abi: PrincipleTokenABI,
        functionName: 'buyPresale',
        args: [BigInt(tokenId), BigInt(numericTokens)],
        gas: buyGas,
        gasPrice: getGasPriceWei(),
      })

      setIsBuying(false)
      setSuccessTokens(numericTokens)
      refetch()
      onSuccess?.()
      setTimeout(() => {
        setSuccessTokens(null)
        onClose()
      }, 2500)

    } catch (err: any) {
      console.error(err)
      setIsApproving(false)
      setIsBuying(false)
      const raw: string = err?.shortMessage || err?.message || 'Unknown error occurred'
      // Strip noisy prefixes wagmi/viem add
      const clean = raw.replace(/^.*?:\s*/, '').split('\n')[0]
      setErrorMsg(clean)
    }
  }

  const numericTokens = Number(buyAmount) || 0
  const totalCost = numericTokens * propertyPrice
  const hasEnoughBalance = balance ? parseUnits(totalCost.toString(), 6) <= balance : false

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-pop">

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-foreground bg-primary px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" strokeWidth={2.5} />
            <h2 className="font-heading text-xl font-extrabold">Invest Now</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 opacity-70 transition-opacity hover:bg-white/20 hover:opacity-100"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="rounded-xl border-2 border-foreground/10 bg-muted p-4 space-y-1">
            <div className="text-sm font-semibold text-muted-foreground">Your Balance</div>
            <div className="font-heading text-2xl font-extrabold text-foreground">
              {isUsdcLoading ? '...' : usdcFormatted} <span className="text-base font-bold text-muted-foreground">USDC</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-foreground">Number of Tokens to Buy</label>
            <div className="relative">
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border-2 border-foreground bg-background px-4 py-3 font-mono text-lg font-bold shadow-pop-sm outline-none transition-transform focus:-translate-y-0.5"
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per Token:</span>
              <span className="font-bold">${propertyPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Cost:</span>
              <span className="font-bold text-primary">${totalCost.toLocaleString()} USDC</span>
            </div>
          </div>

          {successTokens !== null && (
            <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
              <div>
                <p className="font-bold">Purchase Successful!</p>
                <p className="mt-0.5 font-medium opacity-80">You now own {successTokens} token{successTokens !== 1 ? 's' : ''} for this property.</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-3 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
              <div>
                <p className="font-bold">Transaction Failed</p>
                <p className="mt-0.5 font-medium opacity-80">{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg(null)} className="ml-auto shrink-0 opacity-50 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleInvest}
            disabled={successTokens !== null || !buyAmount || Number(buyAmount) <= 0 || !hasEnoughBalance || isApproving || isBuying}
            className="btn-candy w-full py-3"
          >
            {isApproving ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Approving USDC...</>
            ) : isBuying ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Buying Tokens...</>
            ) : !hasEnoughBalance ? (
              'Insufficient Balance'
            ) : (
              'Confirm Investment'
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
