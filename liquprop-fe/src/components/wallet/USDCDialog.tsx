import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { isAddress, parseUnits } from 'viem'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { X, Send, QrCode, Copy, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft, Loader2, Sparkles } from 'lucide-react'
import { MockUSDABI } from '@/lib/abis'
import { useUSDCBalance } from '@/hooks/useUSDCBalance'

interface USDCDialogProps {
  onClose: () => void
}

type Tab = 'send' | 'receive'

export function USDCDialog({ onClose }: USDCDialogProps) {
  const [tab, setTab] = useState<Tab>('send')
  const { balance, formatted, refetch, contractAddress } = useUSDCBalance()
  const { address: myAddress } = useAccount()

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex min-h-full items-start justify-center p-4 pt-20 pb-8">
        <div className="w-full max-w-sm rounded-2xl border-2 border-foreground bg-card shadow-pop space-y-5 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-foreground bg-emerald-400 shadow-pop">
                <span className="text-sm font-black text-black">$</span>
              </div>
              <h2 className="font-heading text-base font-extrabold">USDC Wallet</h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-foreground/20 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Balance display */}
          <div className="rounded-xl border-2 border-foreground/10 bg-muted/50 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">Your Balance</p>
            <p className="font-mono text-2xl font-extrabold text-foreground">
              {formatted} <span className="text-base font-semibold text-muted-foreground">USDC</span>
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl border-2 border-foreground/10 bg-muted/40 p-1 gap-1">
            <button
              onClick={() => setTab('send')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all duration-150 ${
                tab === 'send'
                  ? 'border-2 border-foreground bg-primary text-white shadow-pop'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              Send
            </button>
            <button
              onClick={() => setTab('receive')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all duration-150 ${
                tab === 'receive'
                  ? 'border-2 border-foreground bg-primary text-white shadow-pop'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
              Receive
            </button>
          </div>

          {/* Tab content */}
          {tab === 'send' ? (
            <SendTab
              balance={balance}
              contractAddress={contractAddress}
              onSuccess={() => { refetch(); onClose() }}
            />
          ) : (
            <ReceiveTab
              address={myAddress}
              contractAddress={contractAddress}
              onMinted={refetch}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Send Tab ────────────────────────────────────────────────────────────────

interface SendTabProps {
  balance: bigint | undefined
  contractAddress: `0x${string}` | undefined
  onSuccess: () => void
}

function SendTab({ balance, contractAddress, onSuccess }: SendTabProps) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [txError, setTxError] = useState<string | null>(null)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const recipientValid = recipient.length === 0 || isAddress(recipient)
  const amountNum = parseFloat(amount)
  const amountValid =
    amount.length === 0 ||
    (!isNaN(amountNum) && amountNum > 0 && (balance === undefined || parseUnits(amount, 6) <= balance))

  const canSend =
    isAddress(recipient) &&
    !isNaN(amountNum) &&
    amountNum > 0 &&
    (balance === undefined || parseUnits(amount, 6) <= balance) &&
    Boolean(contractAddress) &&
    !isPending &&
    !isConfirming

  const handleSend = useCallback(async () => {
    if (!canSend || !contractAddress) return
    setTxError(null)
    try {
      writeContract({
        address: contractAddress,
        abi: MockUSDABI,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, parseUnits(amount, 6)],
      })
    } catch (err: any) {
      setTxError(err?.shortMessage ?? err?.message ?? 'Transaction failed')
    }
  }, [canSend, contractAddress, recipient, amount, writeContract])

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
        <p className="font-bold text-foreground">Transfer complete!</p>
        <p className="text-xs text-muted-foreground">
          Sent {amount} USDC to {recipient.slice(0, 6)}…{recipient.slice(-4)}
        </p>
        <button
          onClick={onSuccess}
          className="mt-1 rounded-lg border-2 border-foreground bg-primary px-4 py-2 text-xs font-bold text-white shadow-pop transition-all hover:-translate-y-0.5 hover:shadow-pop-hover"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Recipient */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold">Recipient Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className={`w-full rounded-lg border-2 bg-background px-3 py-2 text-sm font-mono focus:outline-none ${
            recipientValid ? 'border-foreground/20 focus:border-primary' : 'border-destructive'
          }`}
        />
        {!recipientValid && (
          <p className="text-[11px] text-destructive">Invalid address</p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold">Amount (USDC)</label>
          {balance !== undefined && (
            <button
              onClick={() => setAmount(String(Number(balance) / 1e6))}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              Max
            </button>
          )}
        </div>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`w-full rounded-lg border-2 bg-background px-3 py-2 text-sm font-mono focus:outline-none ${
            amountValid ? 'border-foreground/20 focus:border-primary' : 'border-destructive'
          }`}
        />
        {!amountValid && amount.length > 0 && (
          <p className="text-[11px] text-destructive">
            {isNaN(amountNum) || amountNum <= 0 ? 'Enter a valid amount' : 'Insufficient balance'}
          </p>
        )}
      </div>

      {/* Error */}
      {txError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" strokeWidth={2.5} />
          <p className="text-[11px] text-destructive">{txError}</p>
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={!canSend}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-foreground bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-pop transition-all hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-active disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-pop"
      >
        {isPending || isConfirming ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            {isPending ? 'Confirm in wallet…' : 'Confirming…'}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" strokeWidth={2.5} />
            Send USDC
          </>
        )}
      </button>
    </div>
  )
}

// ─── Receive Tab ──────────────────────────────────────────────────────────────

const QUICK_AMOUNTS = [1_000, 10_000, 100_000]

interface ReceiveTabProps {
  address?: string
  contractAddress?: `0x${string}`
  onMinted?: () => void
}

function ReceiveTab({ address, contractAddress, onMinted }: ReceiveTabProps) {
  const [copied, setCopied] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [mintError, setMintError] = useState<string | null>(null)

  const { writeContract, data: mintHash, isPending: isMinting } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintHash })

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleMint = useCallback((usdcAmount: number) => {
    if (!address || !contractAddress) return
    setMintError(null)
    try {
      writeContract({
        address: contractAddress,
        abi: [
          {
            type: 'function',
            name: 'mint',
            inputs: [
              { name: 'to', type: 'address', internalType: 'address' },
              { name: 'amount', type: 'uint256', internalType: 'uint256' },
            ],
            outputs: [],
            stateMutability: 'nonpayable',
          },
        ] as const,
        functionName: 'mint',
        args: [address as `0x${string}`, parseUnits(String(usdcAmount), 6)],
      })
    } catch (err: any) {
      setMintError(err?.shortMessage ?? err?.message ?? 'Mint failed')
    }
  }, [address, contractAddress, writeContract])

  // Call onMinted after tx confirms
  if (mintSuccess && onMinted) {
    onMinted()
  }

  const customAmountNum = parseFloat(customAmount)
  const customValid = !isNaN(customAmountNum) && customAmountNum > 0

  console.log('canMint', address, contractAddress, isMinting, isConfirming)
  const canMint = Boolean(address && contractAddress && !isMinting && !isConfirming)

  return (
    <div className="space-y-4">
      {/* Address box */}
      <div className="rounded-xl border-2 border-foreground/10 bg-muted/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-xs font-semibold text-muted-foreground">Your Wallet Address</p>
        </div>
        <p className="break-all font-mono text-xs font-semibold text-foreground leading-relaxed">
          {address ?? '—'}
        </p>
        <button
          onClick={handleCopy}
          disabled={!address}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-foreground bg-secondary px-3 py-2 text-xs font-bold text-white shadow-pop transition-all hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-active disabled:opacity-50"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={2.5} />
              Copy Address
            </>
          )}
        </button>
      </div>

      {/* Mint section */}
      <div className="rounded-xl border-2 border-dashed border-emerald-400/50 bg-emerald-400/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Get Test USDC</p>
          <span className="ml-auto rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600">Testnet only</span>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => handleMint(amt)}
              disabled={!canMint}
              className="flex flex-1 items-center justify-center rounded-lg border-2 border-emerald-400/40 bg-emerald-400/10 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:border-emerald-500 hover:bg-emerald-400/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {amt >= 1000 ? `${amt / 1000}k` : amt}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Custom amount…"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="flex-1 rounded-lg border-2 border-foreground/20 bg-background px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={() => customValid && handleMint(customAmountNum)}
            disabled={!canMint || !customValid}
            className="rounded-lg border-2 border-foreground bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-pop transition-all hover:-translate-y-0.5 hover:shadow-pop-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mint
          </button>
        </div>

        {/* Pending state */}
        {(isMinting || isConfirming) && (
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
            {isMinting ? 'Confirm in wallet…' : 'Confirming mint…'}
          </div>
        )}
        {mintSuccess && (
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            Minted! Balance updated.
          </div>
        )}
        {mintError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" strokeWidth={2.5} />
            <p className="text-[11px] text-destructive">{mintError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
