# FE Task — Chain / RPC / Contracts Integration

Backend has moved all chain info, RPC URLs, and contract addresses out of `.env` into the database.
The frontend now has a set of REST endpoints to fetch this data dynamically instead of hardcoding anything.

---

## Base URL

```
http://localhost:8000/v1
```

---

## New Endpoints

### 1. List All Active Chains

```
GET /v1/chains
```

**Response**
```json
{
  "status": 200,
  "code": null,
  "message": null,
  "data": [
    {
      "id": 1,
      "chainId": 84532,
      "name": "Base Sepolia",
      "shortName": "base-sepolia",
      "nativeCurrencyName": "Ether",
      "nativeCurrencySymbol": "ETH",
      "nativeCurrencyDecimals": 18,
      "blockExplorerName": "Basescan",
      "blockExplorerUrl": "https://sepolia.basescan.org",
      "isTestnet": true,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Use for**: building the viem/wagmi chain config and RainbowKit chain list dynamically.

---

### 2. Get a Single Chain

```
GET /v1/chains/:chainId
```

**Example**: `GET /v1/chains/84532`

**Response**: same shape as one item from the list above.

---

### 3. Proxy JSON-RPC Request

```
POST /v1/rpc/:chainId
```

**Example**: `POST /v1/rpc/84532`

**Request body** — standard JSON-RPC payload:
```json
{
  "jsonrpc": "2.0",
  "method": "eth_blockNumber",
  "params": [],
  "id": 1
}
```

**Response**: the raw JSON-RPC response from the upstream RPC, forwarded as-is.

**Use for**: wagmi/viem `http()` transport. Instead of pointing at Infura directly, point at
`/v1/rpc/:chainId` so the RPC URL stays server-side.

Wagmi config example:
```ts
import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'

// Fetch chains from API first, then build config:
const chain = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8000/v1/rpc/84532'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [chain],
  transports: { [chain.id]: http() },
})
```

---

### 4. List Contracts for a Chain

```
GET /v1/chains/:chainId/contracts
```

**Example**: `GET /v1/chains/84532/contracts`

**Response**
```json
{
  "status": 200,
  "code": null,
  "message": null,
  "data": [
    {
      "id": 1,
      "chainId": 84532,
      "contractName": "CH_ASSET",
      "address": "0xa3B8a1d1a25cD110FbB77cdAF5987B0A6951A1fa",
      "abi": null,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    },
    {
      "id": 2,
      "chainId": 84532,
      "contractName": "CH_FACTORY",
      "address": "0x7c8745917648b1426718524465208Cd904E99e3D",
      "abi": null,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Contract names currently seeded for Base Sepolia (chainId 84532)**:

| contractName     | Description                        |
|------------------|------------------------------------|
| `CH_USDC`        | Mock USDC token                    |
| `CH_GUARD_FACTORY` | Guard factory                    |
| `CH_FACTORY`     | Fundraise factory                  |
| `CH_ASSET`       | Principle asset (NFT)              |
| `CH_PT`          | Principle token                    |
| `PROXY_ADMIN_PT` | Proxy admin for principle token    |
| `SWAP_ROUTER_PT` | Swap router for principle token    |

---

### 5. Get a Contract with ABI

```
GET /v1/chains/:chainId/contracts/:address
```

**Example**: `GET /v1/chains/84532/contracts/0xa3B8a1d1a25cD110FbB77cdAF5987B0A6951A1fa`

**Response**
```json
{
  "status": 200,
  "code": null,
  "message": null,
  "data": {
    "id": 1,
    "chainId": 84532,
    "contractName": "CH_ASSET",
    "address": "0xa3B8a1d1a25cD110FbB77cdAF5987B0A6951A1fa",
    "abi": [ ... ],
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

The `abi` field is `null` until the backend admin populates it. Check `abi !== null` before using.

---

## Suggested Frontend Implementation

### `src/lib/apicall/chains.ts`

```ts
import axios from '../axios'

export type ChainData = {
  id: number
  chainId: number
  name: string
  shortName: string | null
  nativeCurrencyName: string
  nativeCurrencySymbol: string
  nativeCurrencyDecimals: number
  blockExplorerName: string | null
  blockExplorerUrl: string | null
  isTestnet: boolean
  isActive: boolean
}

export type ContractData = {
  id: number
  chainId: number
  contractName: string
  address: string
  abi: unknown[] | null
  isActive: boolean
}

export const getChains = () =>
  axios.get<{ data: ChainData[] }>('/chains').then(r => r.data.data)

export const getChain = (chainId: number) =>
  axios.get<{ data: ChainData }>(`/chains/${chainId}`).then(r => r.data.data)

export const getContracts = (chainId: number) =>
  axios.get<{ data: ContractData[] }>(`/chains/${chainId}/contracts`).then(r => r.data.data)

export const getContract = (chainId: number, address: string) =>
  axios.get<{ data: ContractData }>(`/chains/${chainId}/contracts/${address}`).then(r => r.data.data)
```

### Build viem chain config from API data

```ts
import { defineChain } from 'viem'
import { getChains } from './apicall/chains'

export async function buildViemChains(apiBaseUrl: string) {
  const chains = await getChains()

  return chains.map(c =>
    defineChain({
      id: c.chainId,
      name: c.name,
      nativeCurrency: {
        name: c.nativeCurrencyName,
        symbol: c.nativeCurrencySymbol,
        decimals: c.nativeCurrencyDecimals,
      },
      rpcUrls: {
        default: { http: [`${apiBaseUrl}/rpc/${c.chainId}`] },
      },
      blockExplorers: c.blockExplorerUrl
        ? { default: { name: c.blockExplorerName ?? 'Explorer', url: c.blockExplorerUrl } }
        : undefined,
      testnet: c.isTestnet,
    })
  )
}
```

### Build contract address map from API

```ts
import { getContracts } from './apicall/chains'

export async function loadContractAddresses(chainId: number) {
  const contracts = await getContracts(chainId)
  return Object.fromEntries(contracts.map(c => [c.contractName, c.address as `0x${string}`]))
}

// Usage:
// const addr = await loadContractAddresses(84532)
// addr.CH_PT  // → '0x4FEa522B523A5c3C9a99D0E0d62d4987e1781cf2'
```

---

## Error Responses

All errors follow the standard shape:

```json
{
  "status": 404,
  "code": "BAD_REQUEST",
  "message": "Chain 999 not found",
  "data": {}
}
```

| HTTP Status | Meaning                              |
|-------------|--------------------------------------|
| 404         | Chain or contract not found          |
| 400         | Chain is disabled (`isActive=false`) |
| 502         | Upstream RPC returned an error       |

---

## Checklist

- [ ] Create `src/lib/apicall/chains.ts` with the API call helpers above
- [ ] Replace hardcoded `baseSepolia` import from `viem/chains` with dynamic chain built from API
- [ ] Replace hardcoded `CONTRACT_ADDRESSES` usage with `loadContractAddresses()` from API
- [ ] Update `Web3Provider.tsx` to fetch chains on mount and pass to wagmi config
- [ ] Use `/v1/rpc/:chainId` as the RPC transport URL in wagmi config (hides Infura key from client)
- [ ] Handle loading/error states while chains are being fetched
