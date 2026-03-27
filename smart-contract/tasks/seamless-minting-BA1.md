# ✅ Business Adjustment 1 — Smart Contract Tasks
# Level: Application

## Context
Currently `mintAsset()` is restricted to `onlyAdmin`, blocking general users from tokenizing their own property. This task opens up property minting to any verified user while introducing platform fee collection, yield distribution with configurable proportions, and SLA parameters stored on-chain.

---

## Tasks

### 1. Public Property Registration
- [x] Add a new public function `registerProperty(string calldata metadataURI) returns (uint256 tokenId)` in `PrincipleToken.sol`
  - Mints an ERC721 (PrincipleAsset) to `msg.sender` — removes the `onlyAdmin` gate for self-registration
  - Emits a `PropertyRegistered(address owner, uint256 tokenId, string metadataURI)` event
  - The `metadataURI` points to off-chain JSON (IPFS or backend-hosted) containing name, location, legal info, prospectus link, etc.
- [x] Keep the existing `mintAsset(address to)` as admin-only for back-office / override use cases
- [x] Add `address public owner` to `PrincipleToken.sol` (provided via `OwnableUpgradeable`)
- [x] make sure the property token is released after launchpad were matured / already in sale time

### 2. Extend `PositionInput` / `Position` Struct with Yield SLA Parameters
- [x] In `Structs.sol`, add the following fields to `PositionInput` and `Position`:
  ```solidity
  uint256 holderYieldBPS;      // e.g. 9000 = 90% of distributed yield goes to holders
  uint256 baselineYieldBPS;    // e.g. 500 = 5% goes to increasing the baseline (floor)
  // platformYieldBPS is implicitly (10000 - holderYieldBPS - baselineYieldBPS)
  uint256 yieldPeriodSeconds;  // minimum time between yield distributions
  uint256 reportPeriodSeconds; // maximum time between property reports (for SLA tracking)
  ```
- [x] Validate in `mintPrinciple()` that `holderYieldBPS + baselineYieldBPS <= 9700` (leaving at least 3% for platform) and each value is non-zero
- [x] remember that property issuer can choose they wanna pay using monthly deduction or percentage, if monthly deduction when property owner pay dividend it will deduct from total fee that remaining then the dividend will be distributed to holder and baseline, if percentage the 97% will be distributed to holder and baseline and 3% will be going to platform

### 3. Platform Fee at Mint Time (0.5% Token Ownership)
- [x] Add a `platformTreasury` address (set via `initialize` or an `onlyOwner` setter)
- [x] In `mintPrinciple()`, before minting ERC1155 tokens to the pool, calculate `platformFeeAmount = totalSupply * 50 / 10000` (0.5% of total supply)
  - Mint `platformFeeAmount` ERC1155 tokens directly to `platformTreasury`
  - Remaining `totalSupply - platformFeeAmount` goes to the pool as before
- [x] Emit `PlatformFeeMinted(address treasury, uint256 tokenId, uint256 amount)` event

### 4. Yield Distribution Function
- [x] Add `distributeYield(uint256 tokenId_, uint256 yieldTokenAmount)` in `PrincipleToken.sol`
  - Callable only by the position owner stored in `idToPosition[tokenId_].owner`
  - Accepts a USDC amount that the owner has pre-approved to this contract
  - Split:
    - `holderShare = amount * position.holderYieldBPS / 10000` → claimable by ERC1155 holders pro-rata (pull-based)
    - `baselineShare = amount * position.baselineYieldBPS / 10000` → sent to the property's `PrincipleGuard` to strengthen floor liquidity
    - `platformShare = amount - holderShare - baselineShare` → sent to `platformTreasury`
  - Emits `YieldDistributed(uint256 tokenId, uint256 holderShare, uint256 baselineShare, uint256 platformShare, uint256 timestamp)`
  - Enforces `block.timestamp >= lastYieldDistribution[tokenId_] + position.yieldPeriodSeconds` to prevent early distributions
- [x] Add claimable yield mapping: implemented via `accumulatedYieldPerToken` + `yieldDebt` (reward-per-token pattern)
- [x] Add `claimYield(uint256 tokenId_)` for token holders to pull their share

### 5. Guard Contract: Baseline Upgrade Hook
- [x] In `PrincipleGuard.sol`, add `function addToFloor(uint256 usdcAmount) external onlyManager`
  - Takes USDC and adds to the floor liquidity position, effectively raising the baseline protection value
  - This is called internally by `distributeYield()` for the `baselineShare` portion

### 6. Report SLA — Lightweight On-Chain Acknowledgement
- [x] Add `mapping(uint256 tokenId => uint256 lastReportTimestamp) public lastReport`
- [x] Add `acknowledgeReport(uint256 tokenId_)` callable only by the property owner
  - Sets `lastReport[tokenId_] = block.timestamp`
  - Emits `ReportAcknowledged(uint256 tokenId, uint256 timestamp)`
- [x] In `distributeYield()`, enforce: if `block.timestamp > lastReport[tokenId_] + position.reportPeriodSeconds`, revert with `"Report SLA breached: submit report first"`
  - This ties reporting compliance directly to the right to distribute yield

---

## New Events Summary
```solidity
event PropertyRegistered(address indexed owner, uint256 indexed tokenId, string metadataURI);
event PlatformFeeMinted(address indexed treasury, uint256 indexed tokenId, uint256 amount);
event YieldDistributed(uint256 indexed tokenId, uint256 holderShare, uint256 baselineShare, uint256 platformShare, uint256 timestamp);
event ReportAcknowledged(uint256 indexed tokenId, uint256 timestamp);
```

---

## Cross-App Dependencies
- Backend must handle new events `PropertyRegistered`, `YieldDistributed`, `ReportAcknowledged`, `PlatformFeeMinted`
  → see `smart-contract/tasks/backend-adjustment/seamless-minting-BA1.md`
- Indexer must index the new events above
  → see `smart-contract/tasks/indexer-adjustment/seamless-minting-BA1.md`

---

## Build & Lint
- `forge build` — zero compilation errors required
- `forge fmt --check` — style check
- `forge test` — all existing tests must still pass
