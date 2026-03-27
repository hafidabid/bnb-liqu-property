# BA1 — Backend Adjustment Notes (from Smart Contract)
# Level: Cross-App

## Context
These are the smart-contract-side changes in BA1 that require backend updates. The backend team should use these as a reference against their own task file at `liqu-be/tasks/seamless-minting-BA1.md`.

---

## New / Changed Contract Functions

### `PrincipleToken.sol`

| Function | Visibility | Description |
|----------|-----------|-------------|
| `registerProperty(string metadataURI) returns (uint256)` | `external` | Replaces admin-gated minting. Any user can call this to register a property and get an ERC721. Backend must build the unsigned tx and submit on behalf of the user. |
| `mintPrinciple(PositionInput input)` | `external` | Now requires `holderYieldBPS`, `baselineYieldBPS`, `yieldPeriodSeconds`, `reportPeriodSeconds`, `feeType` in the input struct. Backend tx builders must include these fields. |
| `distributeYield(uint256 tokenId, uint256 amount)` | `external` | Called by the property owner. Backend must build the tx, enforce that `lastReport` is not SLA-breached before submitting. |
| `acknowledgeReport(uint256 tokenId)` | `external` | Called by property owner to satisfy report SLA. Backend must build the tx after the owner uploads a report document. |
| `claimYield(uint256 tokenId)` | `external` | Called by ERC1155 token holders to pull their yield share. Backend/frontend must expose this. |
| `setPlatformTreasury(address)` | `onlyOwner` | Admin-only. Must be called once after deployment before `mintPrinciple` works. |

### `PrincipleGuard.sol`

| Function | Visibility | Description |
|----------|-----------|-------------|
| `addToFloor(uint256 usdcAmount)` | `onlyManager` | Called internally by `distributeYield` — no direct backend action needed, but backend should be aware for ABI completeness. |

---

## New Events to Listen To

Backend event listener / webhook service must handle the following new events emitted by `PrincipleToken`:

| Event | Trigger | Backend Action |
|-------|---------|----------------|
| `PropertyRegistered(address indexed owner, uint256 indexed tokenId, string metadataURI)` | `registerProperty()` | Set `Property.tokenId` and transition status `DRAFT → REGISTERED` |
| `PlatformFeeMinted(address indexed treasury, uint256 indexed tokenId, uint256 amount)` | `mintPrinciple()` | Record platform fee allocation; transition status `REGISTERED → TOKENIZED` |
| `YieldDistributed(uint256 indexed tokenId, uint256 holderShare, uint256 baselineShare, uint256 platformShare, uint256 timestamp)` | `distributeYield()` | Create `YieldDistribution` record; update `PropertySLA.nextYieldDueAt` |
| `ReportAcknowledged(uint256 indexed tokenId, uint256 timestamp)` | `acknowledgeReport()` | Mark report as on-chain confirmed; update `PropertySLA.nextReportDueAt` |

---

## Updated `PositionInput` Struct

The backend tx builder for `mintPrinciple` must now include:

```ts
interface PositionInput {
  totalSupply: PrincipleSupply;   // enum: FIRST (10_000 tokens) | SECOND (100_000 tokens)
  presaleAmount: number;          // in BPS of total supply (e.g. 2000 = 20%)
  deadline: bigint;               // Unix timestamp
  tokenId: bigint;                // ERC721 tokenId from registerProperty
  presalePrice: bigint;           // USDC per token (6 decimals)
  holderYieldBPS: bigint;         // NEW: e.g. 7000 = 70%
  baselineYieldBPS: bigint;       // NEW: e.g. 2700 = 27%
  yieldPeriodSeconds: bigint;     // NEW: minimum seconds between distributions
  reportPeriodSeconds: bigint;    // NEW: max seconds between reports
  feeType: FeeType;               // NEW: 0 = YIELD_PERCENTAGE | 1 = MONTHLY
}
```

Validation rule (must also enforce on backend before tx submission):
- `YIELD_PERCENTAGE`: `holderYieldBPS + baselineYieldBPS <= 9700`
- `MONTHLY`: `holderYieldBPS + baselineYieldBPS == 10000` (platform takes nothing on-chain)

---

## New Error Codes (for error handling)

| Error | Selector | Thrown When |
|-------|----------|-------------|
| `TreasuryNotSet()` | — | `mintPrinciple` called before `setPlatformTreasury` |
| `ReportSLABreached()` | — | `distributeYield` called after report deadline passed |
| `YieldPeriodNotElapsed()` | — | `distributeYield` called too early |
| `NotPositionOwner()` | — | `distributeYield` / `acknowledgeReport` called by non-owner |

---

## ABI Regeneration Required

After smart contract redeployment, regenerate the ABI and update:
- `liqu-be/src/config/abis/PrincipleToken.json` (or wherever ABI is stored)
- Any typed contract client (wagmi codegen, viem, ethers)

---

## Notes
- `mintAsset(address to)` remains admin-only — no change to existing admin flow
- Platform treasury receives 0.5% of ERC1155 supply at mint time (on-chain, no backend action needed beyond recording the `PlatformFeeMinted` event)
- Full backend task spec: `liqu-be/tasks/seamless-minting-BA1.md`
