# ✅ Business Adjustment 1 — Indexer Tasks
# Level: Application

## Context
New smart contract events introduced in BA1 need to be indexed for frontend queries and backend analytics. The indexer must handle property registration, yield distributions, report acknowledgements, and platform fee events.

---

## Tasks

### 1. Update ABI
- [x] Update `PrincipleTokenABI.ts` to include the four new events:
  - `PropertyRegistered(address indexed owner, uint256 indexed tokenId, string metadataURI)`
  - `YieldDistributed(uint256 indexed tokenId, uint256 holderShare, uint256 baselineShare, uint256 platformShare, uint256 timestamp)`
  - `ReportAcknowledged(uint256 indexed tokenId, uint256 timestamp)`
  - `PlatformFeeMinted(address indexed treasury, uint256 indexed tokenId, uint256 amount)`
- [x] Update `mintPrinciple` input struct with new `PositionInput` fields (`holderYieldBPS`, `baselineYieldBPS`, `yieldPeriodSeconds`, `reportPeriodSeconds`, `feeType`)
- [x] Update `getIdToPosition` output struct with new `Position` fields (same as above)
- [x] Add new functions: `registerProperty`, `distributeYield`, `acknowledgeReport`, `claimYield`, `setPlatformTreasury`, `platformTreasury`, `accumulatedYieldPerToken`, `lastYieldDistribution`, `lastReport`
- [x] Add new errors: `TreasuryNotSet`, `ReportSLABreached`, `YieldPeriodNotElapsed`, `NotPositionOwner`, `NotYetMatured`, `FinishedFundraise`
- [x] After smart contract redeployment, update `CH_PT` env var in `.env` / `docker-compose.yml` to the new contract address

---

### 2. New Ponder Tables (Schema)
- [x] Add `propertyRegistered` table to `services/schemas/pt.schema.ts`
- [x] Add `yieldDistributed` table to `services/schemas/pt.schema.ts`
- [x] Add `reportAcknowledged` table to `services/schemas/pt.schema.ts`
- [x] Add `platformFeeMinted` table to `services/schemas/pt.schema.ts`
- [x] Export all four new tables from `ponder.schema.ts`

---

### 3. New Event Handlers
- [x] Add `PrincipleToken:PropertyRegistered` handler in `src/index.ts`
- [x] Add `PrincipleToken:PlatformFeeMinted` handler in `src/index.ts`
- [x] Add `PrincipleToken:YieldDistributed` handler in `src/index.ts`
- [x] Add `PrincipleToken:ReportAcknowledged` handler in `src/index.ts`

---

### 4. Docker Compose — Verify Existing Setup

- [x] `PONDER_RPC_URL_*` env vars are still correct after contract redeployment
- [x] `CH_PT` env var points to the redeployed contract address

---

## Cross-App Dependencies
- Backend needs new REST endpoints that query this indexer via GraphQL
  → see `liqu-indexer/tasks/backend-adjustment/seamless-minting-BA1.md`

---

## Build & Lint
- `npm run dev` (or `ponder dev`) should start cleanly with no TypeScript errors
- build with `npm run build`
