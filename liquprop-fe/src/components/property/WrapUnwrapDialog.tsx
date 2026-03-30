import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useWriteContract, usePublicClient, useReadContract } from 'wagmi'
import { X, Loader2, ArrowRightLeft, AlertCircle, CheckCircle2 } from 'lucide-react'

import { PrincipleTokenABI } from '@/lib/abis/PrincipleTokenABI'

interface WrapUnwrapDialogProps {
    isOpen: boolean
    onClose: () => void
    mode: 'wrap' | 'unwrap'
    tokenId: string
    propertyPrice: bigint
    principleTokenAddress: string
    yieldTokenAddress: string
    maxAmount: number
    onSuccess?: () => void
}

export function WrapUnwrapDialog({
    isOpen,
    onClose,
    mode,
    tokenId,
    propertyPrice,
    principleTokenAddress,
    yieldTokenAddress,
    maxAmount,
    onSuccess,
}: WrapUnwrapDialogProps) {
    const { address, isConnected } = useAccount()
    const publicClient = usePublicClient()

    const [inputAmount, setInputAmount] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMode, setSuccessMode] = useState<'wrap' | 'unwrap' | null>(null)

    const { writeContractAsync: writeAction } = useWriteContract()

    // 1. Check allowances/approvals
    const { data: isApprovedForAll, refetch: refetchApproval1155 } = useReadContract({
        address: principleTokenAddress as `0x${string}`,
        abi: PrincipleTokenABI,
        functionName: 'isApprovedForAll',
        args: address ? [address, principleTokenAddress as `0x${string}`] : undefined,
        query: { enabled: !!address && mode === 'wrap' }
    })

    const { data: ytAllowance, refetch: refetchAllowance20 } = useReadContract({
        address: yieldTokenAddress as `0x${string}`,
        abi: [{
            type: 'function',
            name: 'allowance',
            inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
        }],
        functionName: 'allowance',
        args: address ? [address, principleTokenAddress as `0x${string}`] : undefined,
        query: { enabled: !!address && mode === 'unwrap' }
    })

    if (!isOpen || !isConnected) return null

    const numericInput = Number(inputAmount)
    const isValidAmount = numericInput > 0 && numericInput <= maxAmount

    // YieldToken calculation: 1 Fraction = presalePrice * 1e12 YieldTokens
    // propertyPrice is in 6 decimals.
    const yieldAmountRaw = BigInt(numericInput || 0) * propertyPrice * 1000000000000n

    const handleAction = async () => {
        if (!isValidAmount) return
        setErrorMsg(null)

        try {
            setIsProcessing(true)

            if (mode === 'wrap') {
                const amountRaw = BigInt(numericInput)
                // Check ERC1155 approval
                if (!isApprovedForAll) {
                    const tx = await writeAction({
                        address: principleTokenAddress as `0x${string}`,
                        abi: PrincipleTokenABI,
                        functionName: 'setApprovalForAll',
                        args: [principleTokenAddress as `0x${string}`, true],
                    })
                    await publicClient?.waitForTransactionReceipt({ hash: tx })
                    await refetchApproval1155()
                }

                // Call wrap
                const wrapTx = await writeAction({
                    address: principleTokenAddress as `0x${string}`,
                    abi: PrincipleTokenABI,
                    functionName: 'wrap',
                    args: [BigInt(tokenId), amountRaw],
                })
                await publicClient?.waitForTransactionReceipt({ hash: wrapTx })

            } else {
                const amountRaw = BigInt(numericInput)
                // Check ERC20 allowance
                if (typeof ytAllowance === 'bigint' && ytAllowance < yieldAmountRaw) {
                    const tx = await writeAction({
                        address: yieldTokenAddress as `0x${string}`,
                        abi: [{
                            type: 'function',
                            name: 'approve',
                            inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
                            outputs: [{ name: '', type: 'bool' }],
                            stateMutability: 'nonpayable',
                        }],
                        functionName: 'approve',
                        args: [principleTokenAddress as `0x${string}`, yieldAmountRaw],
                    })
                    await publicClient?.waitForTransactionReceipt({ hash: tx })
                    await refetchAllowance20()
                }

                // Call unwrap
                const unwrapTx = await writeAction({
                    address: principleTokenAddress as `0x${string}`,
                    abi: PrincipleTokenABI,
                    functionName: 'unwrap',
                    args: [BigInt(tokenId), amountRaw],
                })
                await publicClient?.waitForTransactionReceipt({ hash: unwrapTx })
            }

            setSuccessMode(mode)
            onSuccess?.()
            setTimeout(() => {
                setSuccessMode(null)
                onClose()
            }, 2500)

        } catch (err: any) {
            console.error(err)
            const raw: string = err?.shortMessage || err?.message || 'Unknown error occurred'
            const clean = raw.replace(/^.*?:\s*/, '').split('\n')[0]
            setErrorMsg(clean)
        } finally {
            setIsProcessing(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-pop">

                {/* Header */}
                <div className={`flex items-center justify-between border-b-2 border-foreground px-6 py-4 text-white ${mode === 'wrap' ? 'bg-indigo-500' : 'bg-amber-500'}`}>
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5" strokeWidth={2.5} />
                        <h2 className="font-heading text-xl font-extrabold">{mode === 'wrap' ? 'Wrap to Trade' : 'Unwrap for Yield'}</h2>
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
                        <div className="text-sm font-semibold text-muted-foreground">{mode === 'wrap' ? 'Unwrapped Balance' : 'Wrapped Equiv Fractions'}</div>
                        <div className="font-heading text-2xl font-extrabold text-foreground">
                            {maxAmount} <span className="text-base font-bold text-muted-foreground">Fractions</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <label className="text-sm font-bold text-foreground">Amount to {mode === 'wrap' ? 'Wrap' : 'Unwrap'}</label>
                            <button
                                onClick={() => setInputAmount(maxAmount.toString())}
                                className="text-xs font-bold text-primary hover:underline hover:opacity-80"
                            >
                                Max
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                type="number"
                                value={inputAmount}
                                onChange={(e) => setInputAmount(e.target.value)}
                                placeholder="0"
                                className="w-full rounded-xl border-2 border-foreground bg-background px-4 py-3 font-mono text-lg font-bold shadow-pop-sm outline-none transition-transform focus:-translate-y-0.5"
                            />
                        </div>

                        <div className="rounded-lg bg-indigo-50/50 p-3 text-sm text-indigo-800 border border-indigo-100">
                            <p className="font-semibold mb-1">{mode === 'wrap' ? 'You will receive:' : 'You will convert:'}</p>
                            <p className="font-mono text-xs break-all text-indigo-600 font-bold">
                                {numericInput ? Number(yieldAmountRaw / 1000000000000000000n).toLocaleString() : '0'} YieldTokens
                            </p>
                        </div>
                    </div>

                    {successMode !== null && (
                        <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                            <div>
                                <p className="font-bold">Transaction Successful!</p>
                                <p className="mt-0.5 font-medium opacity-80">You have successfully {successMode}ped {numericInput} fraction{numericInput !== 1 ? 's' : ''}.</p>
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
                        onClick={handleAction}
                        disabled={successMode !== null || !inputAmount || !isValidAmount || isProcessing}
                        className={`w-full rounded-xl border-2 border-foreground px-4 py-3 font-bold text-white shadow-[2px_2px_0_#171717] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#171717] disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'wrap' ? 'bg-indigo-500' : 'bg-amber-500'}`}
                    >
                        {isProcessing ? (
                            <span className="flex items-center justify-center">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                            </span>
                        ) : !isValidAmount && inputAmount ? (
                            'Invalid Amount'
                        ) : (
                            `Confirm ${mode === 'wrap' ? 'Wrap' : 'Unwrap'}`
                        )}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    )
}
