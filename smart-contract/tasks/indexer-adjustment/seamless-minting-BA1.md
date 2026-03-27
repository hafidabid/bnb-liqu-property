# BA1 — Indexer Adjustment Notes (from Smart Contract)
# Level: Cross-App

## Context
These are the smart-contract-side changes in BA1 that require indexer updates. The indexer team should use these as a reference against their own task file at `liqu-indexer/tasks/seamless-minting-BA1.md`.

---

## New Events to Index

All four new events are emitted by `PrincipleToken`. The indexer must add handlers for each.

### `PropertyRegistered`
```solidity
event PropertyRegistered(address indexed owner, uint256 indexed tokenId, string metadataURI);
```
- Emitted by: `registerProperty(string metadataURI)`
- Key data: who registered (`owner`), which on-chain token (`tokenId`), metadata location (`metadataURI`)
- Use case: sync property registry between chain and backend DB

### `PlatformFeeMinted`
```solidity
event PlatformFeeMinted(address indexed treasury, uint256 indexed tokenId, uint256 amount);
```
- Emitted by: `mintPrinciple(PositionInput)`
- Key data: treasury address, tokenId, fee amount in ERC1155 tokens (not USDC)
- Use case: audit trail for platform fee collection at tokenization time

### `YieldDistributed`
```solidity
event YieldDistributed(uint256 indexed tokenId, uint256 holderShare, uint256 baselineShare, uint256 platformShare, uint256 timestamp);
```
- Emitted by: `distributeYield(uint256 tokenId, uint256 amount)`
- Key data: split of USDC yield across holders, baseline, and platform
- `timestamp` is `block.timestamp` at distribution time (also in the event args, not just block metadata)
- Use case: yield history per property, analytics dashboard

### `ReportAcknowledged`
```solidity
event ReportAcknowledged(uint256 indexed tokenId, uint256 timestamp);
```
- Emitted by: `acknowledgeReport(uint256 tokenId)`
- Key data: tokenId and when the report was acknowledged on-chain
- Use case: SLA compliance tracking — shows when each report window was satisfied

---

## Existing Events (No Change)

These events already exist and should already be indexed. No change required:

| Event | Status |
|-------|--------|
| `PostionRegistered` | Existing |
| `PresaleBought` | Existing |
| `PrincipleAssetMinted` | Existing |
| `PrincipleGuardDeployed` | Existing |
| `MintBase` / `MintAscent` / `MintFloor` | Existing (PrincipleGuard) |

---

## ABI Update Required

After redeployment, update `PrincipleToken` ABI in `ponder.config.ts` to include the four new event signatures above. Without this, Ponder will not detect or decode the new events.

Contract addresses will change on redeployment — update `CONTRACT_ADDRESS_PRINCIPLE_TOKEN` env var accordingly.

---

## New Fields in Existing Events

`PostionRegistered` (note: typo is in the contract) — no field changes, but it now fires in conjunction with `PlatformFeeMinted` in the same `mintPrinciple()` call. If the indexer joins these, use the same `tokenId` as the join key.

---

## Notes
- `addToFloor` in `PrincipleGuard` does not emit a new event — no indexer change needed for that function
- `claimYield` does not emit an event — claimable balances are computed from `YieldDistributed` history + holder ERC1155 balances
- Full indexer task spec: `liqu-indexer/tasks/seamless-minting-BA1.md`
