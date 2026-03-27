# FE Task — Flow Adjustment 1: Resolve Hardcoded Values, Property Images, Yield & Report

## Level: Application

## Context
Several areas of the frontend still use hardcoded/mock data that should come from the backend or blockchain. Additionally, the property listing flow needs image/video upload support with a thumbnail selector, a draft-vs-publish popup, and the yield distribution dialog needs to show SLA-based proportions and a proper blockchain transaction popup.

---

## Task 1 — Resolve Hardcoded Values in the UI

### 1a. Dashboard Portfolio Stats (`src/pages/DashboardPage.tsx`)
Currently the stats card block (Total Invested, Current Value, Yield Earned, Properties Owned) uses `portfolioStats` — a static const array hardcoded at line 23.

**What to do:**
- Call `GET /v1/portfolio/:chainId` (already typed in `src/lib/apicall/portfolio.ts` → `getPortfolio`)
- Replace the four static values with real values from the `Portfolio` response:
  - `totalInvested` → "Total Invested"
  - `totalValue` → "Current Value"
  - `totalPendingYield + totalClaimedYield` → "Yield Earned"
  - `holdings.length` → "Properties Owned"
- Show a skeleton loader while fetching; keep fallback `—` on error
- The "change" sub-label (e.g. "+$1,200 this month") can be removed or kept as static label until a dedicated delta endpoint exists — **ask the user** if unsure

### 1b. Dashboard Recent Transactions (`src/pages/DashboardPage.tsx`)
Currently `recentTx` is a static const array hardcoded at line 75 with fake buy/yield entries.

**What to do:**
- If no real transaction history endpoint exists yet, remove the section or replace with an empty-state placeholder — **do not keep fake data**
- If the backend exposes a transaction history endpoint in future, note here that this section should be wired up then

### 1c. Property Card — APY / Price Per Token / Total Value (`src/pages/DashboardPage.tsx`)
`apiPropertyToCard()` (line 62) maps API properties to card props but hardcodes `apy: 0`, `pricePerToken: 0`, `totalValue: 0`.

**What to do:**
- Fetch market stats per property via `GET /v1/market/:tokenId/:chainId` (see `src/lib/apicall/market.ts` → `getMarketStats`)
- Populate `apy` from `marketStats.apy`, `pricePerToken` from `marketStats.currentPrice`, `totalValue` from `marketStats.totalValue` (or equivalent field)
- Only attempt if `tokenId` is present on the property; leave as `0` / `—` if not yet tokenized

### 1d. Yield Distribution — Hardcoded BPS (`src/pages/MyPropertiesPage.tsx` line 168–170)
The yield split is hardcoded: holder 70%, baseline 20%, platform 10%.

```ts
holderAmount: (amount * 7000n / 10000n).toString(),
baselineAmount: (amount * 2000n / 10000n).toString(),
platformFee: (amount * 1000n / 10000n).toString(),
```

**What to do:**
- Before distributing, fetch the property's SLA from `GET /v1/properties/:id/sla`
- Read `holderYieldBPS` and `baselineYieldBPS` from the SLA response; derive `platformFeeBPS = 10000 - holderYieldBPS - baselineYieldBPS`
- Use these real BPS values to compute the split amounts

---

## Task 2 — Property Images, YouTube Video, and Thumbnail

### 2a. Upload UI in `ListPropertyPage`
Add a new step (or extend the existing Documents step) in the property wizard for media assets.

**What to add:**
- Multi-image uploader: user can drag-drop or select multiple image files (JPEG/PNG/WEBP). Each uploaded file should call `POST /v1/properties/:id/documents` with `type = IMAGE`
- YouTube video URL input: a text field for an optional YouTube URL stored as a document of type `OTHER` with `fileName = 'youtube_url'` and `url = <the youtube url>`
  - Validate that the input is a valid YouTube URL before accepting
- Thumbnail selector: after images are uploaded, display a grid of thumbnails; user clicks one to mark it as the thumbnail
  - The selected thumbnail's document `id` should be stored locally and sent to the backend as `thumbnailDocumentId` on the property `PATCH /v1/properties/:id` body field (see Task 2b)

### 2b. Backend `thumbnailDocumentId` field (cross-app dependency → see `liqu-be` task)
The FE needs a `thumbnailDocumentId: String?` on the Property model to mark which `PropertyDocument` is the thumbnail. Until the BE adds this field, store the selection client-side only and send it when the BE is ready.

**What to do now (FE side):**
- Add a `thumbnailDocumentId` field to the `PATCH /v1/properties/:id` API call helper in `src/lib/apicall/property.ts`
- In the wizard's review/summary step, read `property.thumbnailUrl` (or `property.thumbnailDocument.url`) from the API response and display it as the cover image in `PropertyCard`

### 2c. Draft-vs-Publish popup on wizard submit
Currently the wizard submits directly as DRAFT.

**What to add:**
- When the user clicks the final "Create Property" / "Submit" button, show a confirmation dialog with two choices:
  - **Save as Draft** — submits to backend as `status: DRAFT` (current behavior)
  - **Publish to Launchpad** — submits and then immediately calls `PATCH /v1/properties/:id` with `status: PENDING_REVIEW` or equivalent publish transition
- Show a clear description of what each option means (draft = private, publish = submitted for admin review → on-chain)

---

## Task 3 — Yield and Report Combined Dialog

### 3a. Replace `window.prompt` with a proper dialog
Currently `handleDistributeYield` uses `window.prompt` (line 157 in `MyPropertiesPage.tsx`).

**What to build:**
A dialog component (`YieldReportDialog`) that opens when the user clicks "Distribute Yield", with the following sections:

**Yield section (optional — user can submit without it):**
- USD amount input (formatted, e.g. `1,500.00 USDC`)
- After entering amount, show a read-only breakdown panel:
  - Fetch SLA from `GET /v1/properties/:id/sla`
  - Display: "Holder share: X%" / "Baseline reserve: Y%" / "Platform fee: Z%"
  - Display computed amounts: "Holder receives: $X.XX", "Baseline reserve: $Y.YY", "Platform fee: $Z.ZZ"
- "Proceed" triggers the on-chain transaction flow:
  1. Call `POST /v1/properties/:id/yield/create-tx` with the amount
  2. Show a blockchain transaction popup (similar to current sign flow) prompting the user to sign
  3. On user approval, call `walletClient.signTransaction(...)` then `POST /v1/properties/:id/yield/submit`
  4. Show success toast with tx hash

**Report section (optional — user can submit without yield):**
- Period start / end date pickers
- Description textarea
- Optional document upload (`DocumentDropzone`)

**Combined submit logic:**
- User can fill yield only, report only, or both
- Validate: if yield amount is entered, the blockchain flow must complete first before report is submitted
- Submit report via `POST /v1/properties/:id/reports`

### 3b. Blockchain transaction popup component
Extract/create a reusable `BlockchainTxPopup` component that shows:
- Transaction details (from, to, amount if applicable)
- "Sign & Submit" / "Cancel" buttons
- Loading spinner while signing/broadcasting
- Success/error state with explorer link

This component should be used for both yield distribution and future on-chain actions.

---

## Checklist

### Task 1 — Hardcoded Values
- [ ] Wire `DashboardPage` portfolio stats to `GET /v1/portfolio/:chainId`
- [ ] Remove or replace fake `recentTx` entries with real data or empty state
- [ ] Map `apy`, `pricePerToken`, `totalValue` from market stats API in property cards
- [ ] Fetch SLA `holderYieldBPS` / `baselineYieldBPS` before computing yield split

### Task 2 — Images & Publish Flow
- [ ] Add multi-image upload UI in property wizard (`type=IMAGE`)
- [ ] Add YouTube URL input with validation
- [ ] Add thumbnail selector after image upload
- [ ] Add `thumbnailDocumentId` to PATCH property API helper
- [ ] Show thumbnail in `PropertyCard` when available
- [ ] Add draft-vs-publish confirmation dialog on wizard submit

### Task 3 — Yield + Report Dialog
- [ ] Build `YieldReportDialog` component replacing `window.prompt`
- [ ] Show SLA proportion breakdown in dialog
- [ ] Implement blockchain tx sign flow inside dialog
- [ ] Build reusable `BlockchainTxPopup` component
- [ ] Support submit yield only, report only, or both
- [ ] Show success toast with explorer link after yield tx

---

## Dependencies on Backend
All backend changes are now complete (`liqu-be/tasks/07-flow-adjustment-1.md`).

### Updated / new endpoints available:

| Endpoint | Change |
|---|---|
| `GET /v1/properties` | Now includes `thumbnailDocument: { id, url }` |
| `GET /v1/properties/:id` | Now includes `thumbnailDocument: { id, url }` |
| `GET /v1/my/properties` | Now includes `thumbnailDocument: { id, url }` |
| `PATCH /v1/properties/:id` | Now accepts `thumbnailDocumentId` (string or null) and `status` (`"PENDING_REVIEW"` for publish) |
| `POST /v1/properties/:id/documents` | Now accepts a `url` field (no file) for YouTube links — send `type=OTHER`, `fileName=youtube_url`, `url=<youtube-url>` |
| `GET /v1/properties/:id/sla` | Now includes computed `platformFeeBPS` field |
| `POST /v1/properties/:id/yield-and-report/:chainId` | **New** — combined yield + report submission (JSON body, no multipart) |
| `GET /v1/portfolio/:chainId` | Already returns `totalClaimedYield` — no changes |

### Payload reference for new/changed endpoints:

**PATCH `/v1/properties/:id`** — publish to launchpad:
```json
{ "status": "PENDING_REVIEW" }
```

**PATCH `/v1/properties/:id`** — set thumbnail:
```json
{ "thumbnailDocumentId": "doc-cuid-here" }
```

**POST `/v1/properties/:id/documents`** — upload YouTube URL (multipart):
```
type = OTHER
fileName = youtube_url
url = https://www.youtube.com/watch?v=...
(no file field needed)
```

**GET `/v1/properties/:id/sla`** — response now includes:
```json
{
  "holderYieldBPS": 7000,
  "baselineYieldBPS": 2000,
  "platformFeeBPS": 1000
}
```

**POST `/v1/properties/:id/yield-and-report/:chainId`** — JSON body:
```json
{
  "yieldTx": "0x...",
  "totalAmount": "1000000",
  "holderAmount": "700000",
  "baselineAmount": "200000",
  "platformFee": "100000",
  "reportPeriodStart": "2025-01-01",
  "reportPeriodEnd": "2025-03-31",
  "reportDescription": "Q1 2025",
  "reportDocumentId": "optional-pre-uploaded-doc-id"
}
```
All fields are optional — supply yield fields, report fields, or both.
