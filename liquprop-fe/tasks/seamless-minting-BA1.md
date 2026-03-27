# Business Adjustment 1 — Frontend Tasks
# Level: Application

## Context
Anyone can now list and tokenize their property. Frontend needs a property listing wizard, property owner dashboard, public property detail page, and MapBox integration for location input. The existing dashboard needs to surface available properties and link to their detail pages.

Backend has implemented:
- Full property CRUD with document upload (S3/R2/MinIO)
- On-chain registration (`registerProperty`) and yield distribution (`distributeYield`) tx builders
- SLA management, report submission, yield history
- Subscription plan management (MONTHLY / YIELD_PERCENTAGE)
- Indexer GraphQL proxy endpoints

Frontend needs new pages, routes, and API clients to complete the property poster flow.

---

## New Packages Required

```bash
bun add mapbox-gl react-map-gl react-dropzone recharts @radix-ui/react-progress react-hook-form zod @hookform/resolvers
bun add -D @types/mapbox-gl
```

---

## New Routes (App.tsx)

Add to the existing `BrowserRouter`:

```tsx
<Route path="/list-property" element={<ListPropertyPage />} />
<Route path="/my-properties" element={<MyPropertiesPage />} />
<Route path="/property/:id" element={<PropertyDetailPage />} />
```

Guards:
- `/list-property` and `/my-properties` → redirect to `/` if wallet not connected
- Reuse existing `useAccount` pattern from `DashboardPage`

---

## New API Client: `src/lib/apicall/property.ts`

Follow the existing pattern in `src/lib/apicall/auth.ts` and `chains.ts`.

```typescript
import { API_BASE_URL } from './config'

// Helper: get JWT from localStorage
const getToken = () => localStorage.getItem('liquprop_jwt') ?? ''
const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
})

// ─── Property CRUD ─────────────────────────────────────────────────

export const createProperty = async (body: CreatePropertyInput) =>
  fetch(`${API_BASE_URL}/v1/properties`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }).then(r => r.json())

export const listProperties = async (page = 1, limit = 20) =>
  fetch(`${API_BASE_URL}/v1/properties?page=${page}&limit=${limit}`).then(r => r.json())

export const getProperty = async (id: string) =>
  fetch(`${API_BASE_URL}/v1/properties/${id}`).then(r => r.json())

export const updateProperty = async (id: string, body: Partial<CreatePropertyInput>) =>
  fetch(`${API_BASE_URL}/v1/properties/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }).then(r => r.json())

export const getMyProperties = async (page = 1, limit = 20) =>
  fetch(`${API_BASE_URL}/v1/my/properties?page=${page}&limit=${limit}`, {
    headers: authHeaders(),
  }).then(r => r.json())

// ─── Documents ─────────────────────────────────────────────────────

export const uploadDocument = async (propertyId: string, file: File, type: string) => {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  form.append('fileName', file.name)
  return fetch(`${API_BASE_URL}/v1/properties/${propertyId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  }).then(r => r.json())
}

export const listDocuments = async (propertyId: string) =>
  fetch(`${API_BASE_URL}/v1/properties/${propertyId}/documents`).then(r => r.json())

export const deleteDocument = async (propertyId: string, docId: string) =>
  fetch(`${API_BASE_URL}/v1/properties/${propertyId}/documents/${docId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(r => r.json())

// ─── SLA ───────────────────────────────────────────────────────────

export const setSLA = async (propertyId: string, body: SetSLAInput) =>
  fetch(`${API_BASE_URL}/v1/properties/${propertyId}/sla`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }).then(r => r.json())

export const getSLA = async (propertyId: string) =>
  fetch(`${API_BASE_URL}/v1/properties/${propertyId}/sla`).then(r => r.json())

// ─── Reports ───────────────────────────────────────────────────────

export const submitReport = async (propertyId: string, formData: FormData) =>
  fetch(`${API_BASE_URL}/v1/properties/${propertyId}/reports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  }).then(r => r.json())

export const listReports = async (propertyId: string) =>
  fetch(`${API_BASE_URL}/v1/properties/${propertyId}/reports`).then(r => r.json())

// ─── Yield ─────────────────────────────────────────────────────────

export const createYieldTx = async (propertyId: string, amount: string) =>
  fetch(`${API_BASE_URL}/v1/properties/${propertyId}/yield/create-tx`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ amount }),
  }).then(r => r.json())

export const submitYieldTx = async (propertyId: string, body: SubmitYieldTxBody) =>
  fetch(`${API_BASE_URL}/v1/properties/${propertyId}/yield/submit`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }).then(r => r.json())

export const getYieldHistory = async (propertyId: string) =>
  fetch(`${API_BASE_URL}/v1/properties/${propertyId}/yield`).then(r => r.json())

// ─── Registration ──────────────────────────────────────────────────

export const createRegisterPropertyTx = async (propertyId: string, metadataURI: string) =>
  fetch(`${API_BASE_URL}/v1/create-register-property-tx`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ propertyId, metadataURI }),
  }).then(r => r.json())

export const submitRegisterProperty = async (propertyId: string, tx: string) =>
  fetch(`${API_BASE_URL}/v1/submit-register-property`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ propertyId, tx }),
  }).then(r => r.json())

// ─── Subscription ──────────────────────────────────────────────────

export const setSubscription = async (propertyId: string, plan: 'MONTHLY' | 'YIELD_PERCENTAGE') =>
  fetch(`${API_BASE_URL}/v1/subscription`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ propertyId, plan }),
  }).then(r => r.json())

export const getSubscription = async (propertyId: string) =>
  fetch(`${API_BASE_URL}/v1/subscription/${propertyId}`, {
    headers: authHeaders(),
  }).then(r => r.json())
```

### Types for the API client

```typescript
interface CreatePropertyInput {
  name: string
  description?: string
  propertyType: string
  address: string
  latitude: number
  longitude: number
  totalAreaSqm?: number
  legalEntityName?: string
  legalRegistrationId?: string
}

interface SetSLAInput {
  yieldPeriodDays: number
  reportPeriodDays: number
  holderYieldBPS: number
  baselineYieldBPS: number
}

interface SubmitYieldTxBody {
  tx: string
  totalAmount: string
  holderAmount: string
  baselineAmount: string
  platformFee: string
}
```

---

## New Pages

### 1. `ListPropertyPage.tsx` — `/list-property`

6-step wizard using `react-hook-form` + `zod`. Show a progress bar at the top (use `@radix-ui/react-progress`).

**Step 1 — Basic Info**
- Fields: `name` (text), `propertyType` (select: residential/commercial/agricultural/industrial), `description` (textarea), `address` (text)
- MapBox lat/lon picker using `react-map-gl`:
  - Display a map centered on the entered address
  - User can drag a marker to set `latitude` / `longitude`
  - Show lat/lon as read-only text inputs below the map
- Env: `VITE_MAPBOX_TOKEN`

**Step 2 — Legal Info + Documents**
- Fields: `legalEntityName`, `legalRegistrationId`, `totalAreaSqm`
- `react-dropzone` for uploading:
  - Legal title document (type: `LEGAL_TITLE`)
  - Legal registration document (type: `LEGAL_REGISTRATION`)
- Each dropzone accepts PDF/image, shows preview, calls `POST /v1/properties/:id/documents` after property is created

**Step 3 — Prospectus**
- Single `react-dropzone` for prospectus PDF (type: `PROSPECTUS`)
- Optional but recommended

**Step 4 — Yield SLA**
- Fields:
  - `holderYieldBPS` (slider 0–9700, step 100 → display as %)
  - `baselineYieldBPS` (slider 0–9700, step 100 → display as %)
  - Auto-calculated: `platformShare = 10000 - holder - baseline` (displayed, read-only)
  - Warning if `holderYieldBPS + baselineYieldBPS > 9700`
  - `yieldPeriodDays` (number input, e.g. 30)
  - `reportPeriodDays` (number input, e.g. 30)
- Calls `POST /v1/properties/:id/sla` after property is created

**Step 5 — Subscription Plan**
- Two card options:
  - **MONTHLY** — $2,000/month flat fee. You keep all yield minus platform baseline cut.
  - **YIELD_PERCENTAGE** — 3% of each yield distribution. Platform cut enforced on-chain.
- Selected plan → calls `POST /v1/subscription`

**Step 6 — Review & Submit**
- Summary of all entered data
- Primary CTA: "Create Property Draft" → `POST /v1/properties`
- On success, navigate to `/my-properties`

**Flow order:**
1. Fill all 6 steps
2. On Step 6 submit → `POST /v1/properties` (creates DRAFT)
3. Immediately after → upload documents from Step 2 and Step 3 (parallel calls to `POST /v1/properties/:id/documents`)
4. Immediately after → `POST /v1/properties/:id/sla`
5. Immediately after → `POST /v1/subscription` with chosen plan
6. Navigate to `/my-properties`

---

### 2. `MyPropertiesPage.tsx` — `/my-properties`

Tabbed dashboard: **My Properties** / **Reports** / **Yield History**

#### Tab 1: My Properties
- Fetch `GET /v1/my/properties` on mount
- Show property cards with:
  - Name, address, property type
  - `PropertyStatusBadge` component (DRAFT=gray, PENDING_REVIEW=yellow, REGISTERED=blue, TOKENIZED=green, LISTED=emerald, SUSPENDED=red)
  - Action buttons per status:
    - **DRAFT** → "Edit" (links to edit form) + "Register On-Chain" button
    - **REGISTERED** → "Tokenize" (links to existing mint flow) + "Set SLA" if not set
    - **TOKENIZED / LISTED** → "Distribute Yield" + "Submit Report"

**Register On-Chain flow (for DRAFT → REGISTERED):**
```
1. Call createRegisterPropertyTx(propertyId, metadataURI)
2. Get unsigned tx from response
3. Use wagmi's `useSignTransaction` / `sendTransaction` to sign and broadcast
   - Actually: call wagmi `sendRawTransaction` after signing with the wallet
   - Pattern: same as existing SIWE + mint flow
4. Call submitRegisterProperty(propertyId, signedTx)
5. Refresh property list
```

**Distribute Yield flow (for TOKENIZED/LISTED):**
```
1. Prompt for amount (USDC, show with 6 decimals)
2. Frontend must first: USDC approve to CH_PT address (use wagmi writeContract for USDC.approve)
3. Call createYieldTx(propertyId, amount_in_raw_units)
4. Sign tx with wallet (wagmi)
5. Call submitYieldTx(propertyId, { tx, totalAmount, holderAmount, baselineAmount, platformFee })
   - Compute amounts: holderAmount = amount * holderYieldBPS / 10000, etc.
```

#### Tab 2: Reports
- List all reports per property
- "Submit Report" button → opens a modal/drawer with:
  - Date range picker (reportPeriodStart, reportPeriodEnd)
  - Description textarea
  - `react-dropzone` for report documents
  - Optional `onChainTxHash` field (if they've already called `acknowledgeReport` on-chain)
  - Submit → `POST /v1/properties/:id/reports`

#### Tab 3: Yield History
- Fetch `GET /v1/properties/:id/yield` for each owned property
- Show a Recharts `AreaChart` with distributed amounts over time
- Table below with: date, totalAmount, holderAmount, baselineAmount, platformFee, txHash

---

### 3. `PropertyDetailPage.tsx` — `/property/:id`

Public page for investors.

- Fetch `GET /v1/properties/:id` on mount
- Header: property name, address, status badge, property type
- MapBox map showing the property location (lat/lon from API)
- Description section
- SLA info: yield period, report period, holder%, baseline%
- **Yield History chart** (Recharts `AreaChart`) — fetch `GET /v1/properties/:id/yield`
- **Reports list** — fetch `GET /v1/properties/:id/reports`
- **Documents** — fetch `GET /v1/properties/:id/documents`, show as download links
- **Invest CTA** (if status = LISTED):
  - "Buy Tokens" → navigate to existing presale/buy flow (pass tokenId)

---

## Dashboard Update

In `DashboardPage.tsx`:
- Replace mock property data with `GET /v1/properties` (paginated, first page)
- Convert API response to local `Property` interface shape
- Each property card links to `/property/:id`
- Add a "List Your Property" CTA button linking to `/list-property`

---

## New Components

### `PropertyWizard.tsx`
- Multi-step form wrapper with step indicator
- Props: `steps: string[]`, `currentStep: number`, `children`

### `DocumentDropzone.tsx`
- Wraps `react-dropzone`
- Props: `onFile: (file: File) => void`, `label: string`, `accept?: Accept`
- Shows file name + size after selection, remove button

### `YieldChart.tsx`
- Recharts `AreaChart` wrapper
- Props: `data: YieldDistribution[]`
- X axis: date, Y axis: amounts in USDC (divide raw by 1e6)

### `PropertyStatusBadge.tsx`
- Pill badge with color per status
- Props: `status: PropertyStatus`
- Extend existing shadcn `Badge` component

---

## On-Chain Tx Flow Pattern

Same pattern as existing mint flow — use this for all new tx endpoints:

```typescript
// 1. Build unsigned tx from backend
const { data: unsignedTx } = await createRegisterPropertyTx(propertyId, metadataURI)

// 2. Sign with wagmi
const { signTransaction } = useSignTransaction()
const signedTx = await signTransaction({
  ...unsignedTx,
  chainId: 84532, // Base Sepolia
})

// 3. Submit to backend (broadcasts to chain)
const result = await submitRegisterProperty(propertyId, signedTx)
```

---

## Redirect Guards

```tsx
// In ListPropertyPage and MyPropertiesPage
const { isConnected } = useAccount()
const navigate = useNavigate()

useEffect(() => {
  if (!isConnected) navigate('/')
}, [isConnected])
```

---

## Environment Variables

Add to `.env`:
```
VITE_MAPBOX_TOKEN=pk.eyJ1...         # MapBox public token
VITE_API_BASE_URL=http://localhost:8000
```

---

## Checklist

- [ ] Install new packages: `mapbox-gl`, `react-map-gl`, `react-dropzone`, `recharts`, `@radix-ui/react-progress`, `react-hook-form`, `zod`, `@hookform/resolvers`
- [ ] Add new routes to `App.tsx`
- [ ] Create `src/lib/apicall/property.ts` with all typed API functions
- [ ] Create `ListPropertyPage.tsx` with 6-step wizard
- [ ] Create `MyPropertiesPage.tsx` with 3-tab dashboard
- [ ] Create `PropertyDetailPage.tsx` with public investor view
- [ ] Update `DashboardPage.tsx` to use real property data
- [ ] Create `PropertyWizard`, `DocumentDropzone`, `YieldChart`, `PropertyStatusBadge` components
- [ ] Add redirect guards to protected pages
- [ ] Set `VITE_MAPBOX_TOKEN` env var
