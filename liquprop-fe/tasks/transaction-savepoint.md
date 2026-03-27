# Transaction Savepoint — Frontend Tasks

## Context

The backend now records every on-chain interaction (property registration, yield distribution) in a `BlockchainTransaction` table with a `status` of `PENDING | CONFIRMED | FAILED`. A new public endpoint is available:

```
GET /v1/properties/:id/transactions
```

Response shape:
```json
{
  "success": true,
  "data": [
    {
      "id": "cuid",
      "propertyId": "...",
      "chainId": "84532",
      "type": "REGISTER_PROPERTY | DISTRIBUTE_YIELD",
      "txHash": "0x...",
      "status": "PENDING | CONFIRMED | FAILED",
      "createdAt": "ISO string",
      "updatedAt": "ISO string",
      "chain": {
        "chainId": "84532",
        "name": "Base Sepolia",
        "blockExplorerUrl": "https://base-sepolia.blockscout.com"
      }
    }
  ]
}
```

The `blockExplorerUrl` is now `https://base-sepolia.blockscout.com` (updated from Basescan). Use it to build explorer links: `${blockExplorerUrl}/tx/${txHash}`.

---

## Tasks

### 1. Add `listTransactions` to apicall layer

In `src/lib/apicall/property.ts`, add:

```typescript
export interface BlockchainTx {
  id: string
  propertyId: string
  chainId: string
  type: 'REGISTER_PROPERTY' | 'DISTRIBUTE_YIELD'
  txHash: string
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  createdAt: string
  updatedAt: string
  chain?: {
    chainId: string
    name: string
    blockExplorerUrl?: string
  }
}

export const listTransactions = (propertyId: string): Promise<BlockchainTx[]> =>
  axiosInstance.get(`/v1/properties/${propertyId}/transactions`).then(r => r.data ?? r)
```

---

### 2. Transaction History tab in `MyPropertiesPage.tsx`

Add a new **"Transactions"** tab (alongside Properties / Reports / Yield History / Market Data).

- Property selector (same pattern as other tabs)
- Table with columns: **Date**, **Type** (formatted: "Register Property" / "Distribute Yield"), **Tx Hash** (truncated, links to block explorer), **Status** (badge: green=CONFIRMED, yellow=PENDING, red=FAILED)
- Each tx hash should be a clickable link to `${chain.blockExplorerUrl}/tx/${txHash}` opening in a new tab
- Show a skeleton loader while fetching; empty state if no transactions yet

---

### 3. Update explorer links in `YieldReportDialog.tsx`

In the success screen of `YieldReportDialog`, the Etherscan link is currently hardcoded to `https://etherscan.io/tx/...`.

- Fetch the chain's `blockExplorerUrl` from the `BlockchainTx` returned by `listTransactions` after success, **or** pass it as a prop from the parent.
- Simplest approach: after `submitYieldAndReport` succeeds, call `listTransactions(property.id)` to get the latest tx, then use `chain.blockExplorerUrl` for the explorer link.

---

### 4. Show registration tx hash in `PropertiesTab`

After a property is registered on-chain in `handleRegisterOnChain`, show the `txHash` in a small toast or inline message with a link to the block explorer.

- After `submitRegisterProperty` returns, fetch `listTransactions(property.id)` to get the most recent REGISTER_PROPERTY tx
- Display a success banner with the tx hash and an explorer link

---

## Build & Lint

- `bun run build` must succeed with zero TypeScript errors
