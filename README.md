# LiquProp
**Baseline-Protected Property Tokenization**

> Prevent permanent loss. Strengthen asset value. Unlock real estate liquidity on chain.

🚀 **[TRY NOW!](https://liquprop.talentor.tech)**

---

## 📖 Background: The Problem

Real estate is the world’s largest store of wealth — but it remains one of the least liquid and least accessible assets.

*   **$379T Global Real Estate Value** (source: Savills)
*   **< 1% is liquid:** ~$2–3T via REITs (source: MSCI and Nareit)
*   **3-12 months** to sell a property
*   **5-10% cost** in transaction fees

### The Hidden Risk of Tokenized RWAs

Tokenization was supposed to fix this (projected $16T market by 2030), but current models simply digitize assets without solving structural risk:
*   Tokenized assets still collapse in price. Most rely purely on market demand.
*   DEX pricing problems: liquidity shocks, panic selling, speculation cycles.
*   There is no redemption floor, no downside protection, no intrinsic value anchor.
*   Permanent loss risk still exists.

**TRADITIONAL PROPERTY** = Illiquid but stable  
**TOKENIZED PROPERTY** = Liquid but fragile

---

## 💡 The Solution: Baseline-Protected Property Tokenization

LiquProp introduces a baseline-backed asset model. It adds the missing layer to real estate tokenization: **Structural downside protection.**

### Core Mechanism
1.  **Property Tokenization:** Represent real estate on-chain.
2.  **Launchpad Funding:** Raise capital from investors.
3.  **Baseline Reserve Pool:** Capital is automatically routed into a Uniswap V3 liquidity vault (Principle Guard) to enforce a price floor.
4.  **Redemption Mechanism:** Tokens cannot rationally trade below their baseline value.

**Baseline = Total Baseline Assets / Total Tokens**

### How LiquProp Works
*   Tokens are redeemable at the baseline price.
*   Redeemed tokens are burned, increasing token scarcity.
*   Dividend injections from property yield strengthen the baseline over time.
*   **Result:** A structural price floor, capital protection, and stronger long-term asset pricing.

---

## ⚙️ System Architecture & User Flow

LiquProp Convergene tokenizes real-world property into on-chain fractions (**Principle Tokens** - ERC-1155). 

### 1. Register Property
The Property Owner registers a property, receiving an ERC-721 (`PrincipleAsset`) property NFT.

### 2. Fractionalize (Mint Principle)
The owner mints fractions (ERC-1155) into a Fundraise Pool, defining the presale amount, price, yield rules, and deadlines. 

### 3. Presale / Fundraise
Investors contribute USDC to the Fundraise Pool to buy presale fractions. 

### 4. Deploy the Token to Market (Uniswap V3 DEX)
Once the fundraise window ends, the raised capital is split:
*   **40%** goes to the Property Owner as immediate payout.
*   **60%** is converted into a self-managing **Uniswap V3 Vault (Principle Guard)**.

The guard deploys liquidity into three positions:
*   **Floor (USDC only):** Hard price floor; always bids for fractions.
*   **Base (YieldToken + USDC):** Market maker catching trading fees.
*   **Ascent (YieldToken only):** Captures upside price appreciation.

### 5. Yield & Protection
*   **Yield Distribution:** The property owner distributes yield. A portion goes to holders, while the *baseline share* goes directly into the Guard to deepen the floor.
*   **Self-Adjusting:** The Guard automatically adjusts to market movements (`traverse` for uptrends, locking in gains; `drift` for downtrends).
*   **Floor-Protected Exit:** Any holder can sell fractions back to the floor at the guaranteed baseline price.

---

## 🏆 Why LiquProp Wins

### Why This Is Game Changing
*   Prevent Permanent Loss
*   Reduce Volatility
*   Align Incentives
*   Strengthen Asset Fundamentals

### Competitive Landscape

| Platform | Property Tokenization | Price Floor | Structural Protection |
| :--- | :---: | :---: | :---: |
| RealT | ✓ | ✗ | ✗ |
| Lofty | ✓ | ✗ | ✗ |
| Tangible | ✓ | ✗ | ✗ |
| **LiquProp** | **✓** | **✓** | **✓** |

LiquProp creates **RWA 2.0**: Capital Protection + Sustainable Tokenomics + Market Stability.

---

## 🌍 Market Opportunity & Vision

**Target Position:** Tokenized Income-Generating Real Estate

We focus on early-stage tokenized properties, emerging markets, underserved regions, and small-mid size property developers. Early adoption segments include rental properties, commercial property, and property development funding. 

**Vision**
The future of real estate finance is on-chain — but it must be structurally protected. LiquProp aims to build the infrastructure layer for protected real-world asset tokenization, transforming real estate from liquid/speculative into **liquid, protected, and fundamental**.
*   On-chain mortgage markets
*   Tokenized property funds
*   Global fractional real estate trading

---

## Deployment

### Frontend
```bash
cd liquprop-fe
npm run build
npm run preview
```

### Backend
```bash
cd liqu-be
npm run build
npm run start
```

### Indexer
```bash
cd liqu-indexer
npm run build
npm run start
```

## Smart contract

### Binance Smart Chain (BSC) Testnet
| Contract | Address |
| :--- | :--- |
| **USDC (Mock)** | `0xacF85E325b66f6fb2752C429Deb73b08a48DEe7e` |
| **Guard Factory** | `0xe01f85e256Ae060E0770153f79e848a57921C41E` |
| **Fundraise Factory** | `0xD371C8A8400eE31a6b4e9C4a139AF0feed58196E` |
| **Principle Asset (ERC-721)** | `0x444597C9Cb824EdD188463950909c4621Eb60Ea8` |
| **Principle Token Proxy (PT)** | `0x345Eb4f31abE294430b7FC792309598D7CB86821` |
| **Principle Router Proxy** | `0x349368BaE07c3bA5d17C4ce94FFA2973CB826D91` |
| **Platform Treasury** | `0x57a89764C6959Fb665E409eE661290B6B32e6c66` |

## 👥 Meet the Team

*   **Arjuna Marcelino** - Full Stack Developer (Software Engineer, Orbitum)
*   **Hafid Abi Daniswara** - Full Stack Developer (Software Engineer, ParagonCorp)
*   **Azka Willian Muhammad** - Full Stack Developer (Software Engineer, MonkLabs)


