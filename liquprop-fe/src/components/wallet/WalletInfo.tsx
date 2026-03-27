import { useAccount, useBalance, useEnsName } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function WalletInfo() {
  const { address, isConnected } = useAccount()
  const { data: balance, isLoading: balanceLoading } = useBalance({ address })
  const { data: ensName } = useEnsName({ address })

  if (!isConnected || !address) {
    return null
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            {ensName ?? truncateAddress(address)}
          </p>
          {ensName && (
            <p className="text-xs text-muted-foreground">{truncateAddress(address)}</p>
          )}
        </div>
        <div className="text-right">
          {balanceLoading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <p className="text-sm font-semibold">
              {balance
                ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
                : '—'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Balance</p>
        </div>
      </CardContent>
    </Card>
  )
}
