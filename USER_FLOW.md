# LiquProp Convergene — End-to-End User Flow

> **From property listing to a fully live on-chain liquidity guard.**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Actors & Contracts](#actors--contracts)
3. [Phase 0 — Prerequisites](#phase-0--prerequisites)
4. [Phase 1 — Register Property](#phase-1--register-property)
5. [Phase 2 — Fractionalize (Mint Principle)](#phase-2--fractionalize-mint-principle)
6. [Phase 3 — Presale / Fundraise](#phase-3--presale--fundraise)
7. [Phase 4 — Deploy the Guard](#phase-4--deploy-the-guard)
8. [Post-Guard Life-Cycle](#post-guard-life-cycle)
9. [Guard Strategy Triggers](#guard-strategy-triggers)
10. [Full Sequence Diagram](#full-sequence-diagram)

---

## System Overview

LiquProp Convergene tokenises real-world property into on-chain fractions called **Principle Tokens** (ERC-1155). After a fundraise, raised capital is automatically routed into a **Principle Guard** — a Uniswap V3 liquidity vault that enforces a price floor on the fractions, distributes yield, and self-adjusts to market movement.

```
Property Owner
     │
     ├─ registers property ──► ERC-721 (PrincipleAsset)
     │
     ├─ fractionalises ──────► ERC-1155 (Principle Tokens) ──► Fundraise Pool
     │                                                              │
     │                                                   Investors buy presale
     │                                                              │
     └─ deploys guard ───────► PrincipleGuard (Uniswap V3 vault) ◄─┘
                                     │
                                     ├─ Floor position  (USDC liquidity – price floor)
                                     ├─ Base position   (YieldToken + USDC – market range)
                                     └─ Ascent position (YieldToken – upside range)
```

---

## Actors & Contracts

| Actor / Contract | Role |
|---|---|
| **Property Owner** | Lists, fractionalises, pays yield, submits reports |
| **Investor** | Buys presale fractions, claims yield, sells fractions |
| **Platform (Admin)** | Mints asset NFTs; receives 0.5 % platform fee |
| `PrincipleToken` | Core ERC-1155 hub; orchestrates all phases |
| `PrincipleAsset` | ERC-721; one NFT per property |
| `Fundraise Pool` | Escrow; holds NFT + fraction tokens during fundraise |
| `GuardFactory` | Deploys `YieldToken` and `PrincipleGuard` |
| `PrincipleGuard` | Uniswap V3 vault; price floor + yield amplification |
| `YieldToken` | ERC-20 counterpart token in the Uniswap pool |
| `Settlement (USDC)` | Payment & yield currency throughout |

---

## Phase 0 — Prerequisites

Before any property can be listed the platform must be set up once by the **admin/owner**.

```
PrincipleToken.setPlatformTreasury(treasuryAddress)
```

| Check | Requirement |
|---|---|
| Platform treasury | Must be set; otherwise `mintPrinciple` reverts with `TreasuryNotSet` |
| Caller | Only the contract owner (`onlyOwner`) |

---

## Phase 1 — Register Property

**Who:** Property Owner  
**Contract call:** `PrincipleToken.registerProperty(metadataURI)`

### What happens on-chain

```
Owner ──► registerProperty("ipfs://Qm...") ──► PrincipleToken
                                                     │
                                          tokenId++  │
                                                     ├──► PrincipleAsset.mint(owner)
                                                     │      (ERC-721 minted to owner)
                                                     │
                                                     └──► emit PropertyRegistered(owner, tokenId, metadataURI)
```

### Outcome

| Item | Value |
|---|---|
| Returns | `uint256 tokenId` (globally incrementing) |
| Owner receives | ERC-721 NFT (`PrincipleAsset`) representing the property |
| Off-chain index | `PropertyRegistered` event carries the IPFS metadata URI |

> **Tip:** The `metadataURI` should point to a JSON file (e.g. IPFS) containing property details — address, valuation, legal documents, images.

---

## Phase 2 — Fractionalize (Mint Principle)

**Who:** Property Owner (must hold the ERC-721 from Phase 1)  
**Contract call:** `PrincipleToken.mintPrinciple(PositionInput)`

### Input Parameters

```solidity
struct PositionInput {
    PrincipleSupply totalSupply;       // FIRST = 10 000 fractions, SECOND = 100 000 fractions
    uint16  presaleAmount;             // % of supply offered in presale (in BPS, max 10 000)
    uint256 deadline;                  // Unix timestamp — end of fundraise window
    uint256 tokenId;                   // ERC-721 token ID from Phase 1
    uint256 presalePrice;              // Price per fraction in USDC (smallest unit)
    uint256 holderYieldBPS;            // % of yield paid to fraction holders (BPS)
    uint256 baselineYieldBPS;          // % of yield fed into the guard floor (BPS)
    uint256 yieldPeriodSeconds;        // Minimum seconds between yield distributions
    uint256 reportPeriodSeconds;       // Maximum seconds the owner can go without a report
    FeeType feeType;                   // YIELD_PERCENTAGE or MONTHLY
}
```

### Validation Rules

| Rule | Error |
|---|---|
| Caller must own the ERC-721 | `UneligibleBalance` |
| `presaleAmount` ≤ 10 000 BPS | `InvalidBPS` |
| `totalSupply` ≠ NULL | `InvalidPrincipleSupply` |
| For `YIELD_PERCENTAGE`: `holderYieldBPS + baselineYieldBPS` ≤ 9 700 (300 BPS reserved for platform) | `InvalidBPS` |
| For `MONTHLY`: `holderYieldBPS + baselineYieldBPS` = 10 000 exactly | `InvalidBPS` |
| Platform treasury is set | `TreasuryNotSet` |

### What happens on-chain

```
Owner ──► mintPrinciple(input) ──► PrincipleToken
                                        │
                          deploy Fundraise pool ◄── fundraiseFactory.deploy(owner, tokenId)
                                        │
                     transfer ERC-721 ──► Fundraise pool (collateral locked)
                                        │
                            mintAmount = 10 000 or 100 000
                            platformFee = mintAmount × 0.5%
                                        │
                         _mint(treasury, tokenId, platformFee)
                         _mint(pool,     tokenId, mintAmount - platformFee)
                                        │
                     store Position struct in LibPrincipleFacet storage
                                        │
                         emit PlatformFeeMinted(treasury, tokenId, platformFee)
                         emit PostionRegistered(owner, tokenId, deadline, pool, presaleAmt, mintAmt)
```

### Token Distribution

| Recipient | Amount |
|---|---|
| Platform Treasury | 0.5 % of total supply |
| Fundraise Pool | Remaining 99.5 % (held for presale + secondary) |

---

## Phase 3 — Presale / Fundraise

**Who:** Investors  
**Contract call:** `PrincipleToken.buyPresale(tokenId_, amount)`

Investors contribute USDC to the Fundraise Pool and receive Principle Token fractions in return.

### Flow

```
Investor ──► buyPresale(tokenId, amount) ──► PrincipleToken
                                                   │
                              settlement.transferFrom(investor, pool, amount × presalePrice)
                                                   │
                              pool.transferPrincipleToken(investor, amount)
                                                   │
                              position.presaleAmount -= amount
                                                   │
                              emit PresaleBought(tokenId, amount, investor)
```

### Guards

| Check | Error |
|---|---|
| Pool address must exist | `PoolAddressIsZero` |
| `amount` ≤ remaining presale supply | `NotEnoughSupply` |
| `amount` > 0 | `AmountShouldNotBZero` |

> **Note:** Presale runs until `position.expiry` (the deadline set in Phase 2). After that window, `deployGuard` becomes callable.

---

## Phase 4 — Deploy the Guard

**Who:** Anyone (permissionless once deadline has passed)  
**Contract call:** `PrincipleToken.deployGuard(name_, symbol_, tokenId_, sqrtPriceX96, floorTick)`

This is the pivotal step — raised USDC is converted into a self-managing Uniswap V3 liquidity vault.

### Pre-conditions

| Condition | Error |
|---|---|
| Position must exist | `TokenIdIsNotExist` |
| Current time ≥ `position.expiry` | `NotYetMatured` |
| Guard not already deployed | `AlreadyDeployed` |
| `settlement` address < `yieldToken` address (token ordering for Uniswap V3) | enforced by loop |

### Capital Split

```
Total USDC in Fundraise Pool
    │
    ├── 25 % ────────────────────────────────► Property Owner (immediate payout)
    │
    └── 75 % ────────────────────────────────► PrincipleGuard vault
                │
                ├── 10 % of 75 % ──────────── Base + Ascent liquidity positions
                └── 90 % of 75 % ──────────── Anchor / Floor liquidity position
```

### What happens on-chain

```
Caller ──► deployGuard(name, symbol, tokenId, sqrtPriceX96, floorTick) ──► PrincipleToken
                                                                                  │
                     1. guardFactory.deployYieldToken(name, symbol)
                        (loop ensures settlement < yieldToken for Uniswap ordering)
                                                                                  │
                     2. guardFactory.deployGuard(yieldToken)
                        ── deploys PrincipleGuard contract
                                                                                  │
                     3. yieldToken.setBasePrice(guardVault)
                        ── only PrincipleGuard can mint/burn YieldToken
                                                                                  │
                     4. store guard + yieldToken addresses in Position
                                                                                  │
                     5. calculate splits from pool USDC balance
                        toOwner = 25 %
                        bal     = 75 %
                        anchor  = bal × 90 %  (floor)
                        base    = bal × 10 %  (base + ascent seed)
                                                                                  │
                     6. pool.transferSettlement(owner, toOwner)   ── owner payout
                        pool.transferSettlement(guard, bal)       ── fund the guard
                                                                                  │
                     7. guard.initPoolAndPosition(sqrtPriceX96, floorTick, base, anchor)
                        │
                        ├── createAndInitializePoolIfNecessary(YieldToken, USDC, 0.3 %)
                        │
                        ├── _mintFloor(anchor, floorTick)
                        │     └── Uniswap V3 position: pure USDC
                        │         [floorTick, floorTick + tickSpacing]
                        │         ── this is the price floor — buying pressure below market
                        │
                        ├── _mintBase(base)
                        │     └── Uniswap V3 position: YieldToken + USDC
                        │         [currentTick ± 20 ticks]
                        │         ── tight range around market price
                        │
                        └── _mintAscent()
                              └── Uniswap V3 position: pure YieldToken
                                  [baseTickUpper, baseTickUpper + 20 ticks]
                                  ── captures upside price appreciation
                                                                                  │
                     8. guard.setManager(PrincipleToken address)
                                                                                  │
                     9. pool.transferPrincipleAsset(owner)
                        ── ERC-721 property NFT returned to owner
                                                                                  │
                    10. emit PrincipleGuardDeployed(guard, yieldToken, floorTick, bal)
```

### Uniswap V3 Positions Inside the Guard

```
Price (USDC per YieldToken)
│
│                              ┌──────────────┐
│                              │   ASCENT     │  ← pure YieldToken
│                              │  (upside)    │
│                    ┌─────────┴──────────────┤
│                    │       BASE             │  ← YieldToken + USDC (market maker)
│                    ├─────────┬──────────────┘
│        ┌───────────┤         │
│        │   FLOOR   │         │
│        │  (anchor) │         │
│        └───────────┘         │
│──────────────────────────────►  Tick (price)
      floorTick             currentTick
```

| Position | Tokens | Purpose |
|---|---|---|
| **Floor** | USDC only | Hard price floor; always bids for fractions |
| **Base** | YieldToken + USDC | Tight spread around market; earns trading fees |
| **Ascent** | YieldToken only | Captures gains when price appreciates |

---

## Post-Guard Life-Cycle

Once the guard is live, the system operates on an ongoing basis.

### Yield Distribution

**Who:** Property Owner  
**Contract call:** `PrincipleToken.distributeYield(tokenId_, amount)`

```
Owner ──► distributeYield(tokenId, amount) ──► PrincipleToken
                                                     │
                      settlement.transferFrom(owner, PrincipleToken, amount)
                                                     │
                      YIELD_PERCENTAGE mode:
                      ├── holderShare   = amount × holderYieldBPS / 10 000
                      ├── platformShare = amount × (10000 - holder - baseline) / 10 000
                      └── baselineShare = remainder
                                                     │
                      MONTHLY mode:
                      ├── holderShare   = amount × holderYieldBPS / 10 000
                      └── baselineShare = remainder  (no platform cut)
                                                     │
                      settlement.transfer(guard,    baselineShare)   ── deepens floor
                      guard.addToFloor(baselineShare)                ── increase floor LP
                      settlement.transfer(treasury, platformShare)   ── platform fee
                      accumulatedYieldPerToken[tokenId] += holderShare / totalSupply
                                                     │
                      emit YieldDistributed(tokenId, holderShare, baselineShare, platformShare, timestamp)
```

**Constraints:**
- Must wait at least `yieldPeriodSeconds` between distributions.
- If `reportPeriodSeconds` is configured, the last `acknowledgeReport` must be within that window.

---

### Claim Yield

**Who:** Any fraction holder  
**Contract call:** `PrincipleToken.claimYield(tokenId_)`

```
pending = (accumulatedYieldPerToken[tokenId] - yieldDebt[tokenId][holder]) × balance / 1e18
settlement.transfer(holder, pending)
yieldDebt[tokenId][holder] = accumulatedYieldPerToken[tokenId]
```

---

### Report Acknowledgement

**Who:** Property Owner  
**Contract call:** `PrincipleToken.acknowledgeReport(tokenId_)`

Periodic on-chain heartbeat proving the owner is still active. Required to remain eligible to distribute yield when `reportPeriodSeconds > 0`.

```
lastReport[tokenId] = block.timestamp
emit ReportAcknowledged(tokenId, timestamp)
```

---

### Sell Fractions (Floor-Protected Exit)

**Who:** Any fraction holder  
**Contract call:** `PrincipleToken.sellPrinciple(tokenId_, amount)`

```
Holder ──► sellPrinciple(tokenId, amount) ──► PrincipleToken
                                                    │
             safeTransferFrom(holder, PrincipleToken, amount)  ── fractions burned/escrowed
                                                    │
             amountToSell = amount × presalePrice
                                                    │
             read Floor LP position (floorTokenId) from guard
             calculate liquidity via LiquidityAmounts.getLiquidityForAmount1()
                                                    │
             guard.decreaseLiquidityFromManager(floorTokenId, liquidity)
                                                    │
             settlement.transfer(holder, amount1)   ── USDC out at floor price
```

The floor always bids — holders can exit at the guaranteed price as long as floor liquidity exists.

---

## Guard Strategy Triggers

The guard continuously re-balances using two automated strategies. Anyone can call them when conditions are met.

### `traverse()` — Price Went Up

**Trigger:** Current tick ≥ `ascentTickLower + ASCENT_TRIGGERED_TICK_LENGTH` (default 240 ticks / ~2.4 %)

```
1. Collect fees from Base + Ascent positions
2. Empty Base liquidity → extract USDC surplus
3. Calculate surplus proportional to how far price traveled into Ascent range
4. Increase Floor liquidity with total surplus     ── floor gets stronger
5. Empty Ascent position
6. Re-mint Base + Ascent around new (higher) market tick
```

> The price floor **ratchets upward** with the market — gains are permanently locked in.

---

### `drift()` — Price Went Down

**Trigger:** Current tick ≤ `snapshotMarketTick - BASE_TRIGGERED_TICK_LENGTH` (default 200 ticks / ~2 %)

```
1. Empty Base liquidity
2. Re-mint Base position around new (lower) market tick
```

> Ascent and Floor remain unchanged; Base re-centres to continue providing liquidity.

---

## Full Sequence Diagram

```
Property Owner                PrincipleToken         Fundraise Pool       PrincipleGuard        Investors
      │                             │                       │                    │                   │
      │──registerProperty()────────►│                       │                    │                   │
      │◄──tokenId + ERC-721─────────│                       │                    │                   │
      │                             │                       │                    │                   │
      │──mintPrinciple(input)───────►│                       │                    │                   │
      │                             │──deploy()────────────►│                    │                   │
      │                             │──transferNFT─────────►│                    │                   │
      │                             │──mint ERC-1155────────►│                    │                   │
      │                             │                       │                    │                   │
      │                             │                       │◄──buyPresale()─────────────────────────│
      │                             │                       │───fractions───────────────────────────►│
      │                             │                       │◄──USDC─────────────────────────────────│
      │                             │                       │                    │                   │
      │  (deadline passes)          │                       │                    │                   │
      │──deployGuard()──────────────►│                       │                    │                   │
      │                             │──deployYieldToken()───────────────────────►│                   │
      │                             │──deployGuard()────────────────────────────►│                   │
      │                             │──transferSettlement(25% to owner)──────────│                   │
      │◄──25% USDC──────────────────│                       │                    │                   │
      │                             │──transferSettlement(75% to guard)──────────►│                  │
      │                             │──initPoolAndPosition()────────────────────►│                   │
      │                             │                       │            [create Uniswap pool]        │
      │                             │                       │            [mint Floor LP]              │
      │                             │                       │            [mint Base LP]               │
      │                             │                       │            [mint Ascent LP]             │
      │◄──ERC-721 returned──────────│                       │                    │                   │
      │                             │                       │                    │                   │
      │  ════════════════ GUARD IS LIVE ════════════════════════════════════════ │                   │
      │                             │                       │                    │                   │
      │──distributeYield()──────────►│                       │                    │                   │
      │                             │──baselineShare────────────────────────────►│                   │
      │                             │                       │            [addToFloor — floor deepens] │
      │                             │                       │                    │◄──claimYield()─────│
      │                             │                       │                    │───USDC────────────►│
      │                             │                       │                    │◄──sellPrinciple()──│
      │                             │                       │            [decrease floor LP]          │
      │                             │                       │                    │───USDC────────────►│
```

---

> **Contract:** `PrincipleToken.sol` — the single entry point for all phases above.  
> **Guard logic:** `PrincipleGuard.sol` — autonomous Uniswap V3 vault post-deployment.  
> **Yield amplifier:** `YieldToken.sol` — virtual ERC-20 used only within the guard pool.
