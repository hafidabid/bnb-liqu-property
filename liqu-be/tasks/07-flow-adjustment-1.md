# BE Task — Flow Adjustment 1: Property Media, Thumbnail, Yield+Report Combined, and Hardcoded Value Fixes

## Level: Application

## Context
Supporting the frontend flow-adjustment-1 work. The backend needs to expose a thumbnail mechanism on properties, ensure the image/YouTube document types are accepted, support a combined yield+report submission endpoint, and confirm SLA proportion data is returned clearly enough for the UI to render breakdowns.

---

## Task 1 — Property Thumbnail Support

### 1a. Add `thumbnailDocumentId` to the `Property` model

Update `prisma/schema.prisma`:

```prisma
model Property {
  // ... existing fields ...
  thumbnailDocumentId String?          // FK → PropertyDocument.id (optional)
  thumbnailDocument   PropertyDocument? @relation("PropertyThumbnail", fields: [thumbnailDocumentId], references: [id])
}

model PropertyDocument {
  // ... existing fields ...
  thumbnailOf Property? @relation("PropertyThumbnail")
}
```

Run `bun run db:push` after schema change.

### 1b. Expose `thumbnailDocumentId` in PATCH `/v1/properties/:id`

- Accept `thumbnailDocumentId` as an optional field in the update body
- Validate that the referenced `PropertyDocument.propertyId` matches the property being updated
- Return `thumbnailDocumentId` and the full `thumbnailDocument` object (id + url) in the property GET response

### 1c. Return `thumbnailDocument` in property list and detail responses

- `GET /v1/properties` — include `thumbnailDocument: { id, url } | null` in each item
- `GET /v1/properties/:id` — same
- `GET /v1/my/properties` — same

---

## Task 2 — Document Type Support for Images and YouTube

### 2a. Verify `IMAGE` document type is accepted

`DocumentType.IMAGE` already exists in the Prisma enum. Confirm the document upload endpoint `POST /v1/properties/:id/documents` correctly accepts `type = "IMAGE"` and stores the file via S3.

**If not already handled:**
- Accept `type = "IMAGE"` in the multipart upload handler
- Store to S3 and return the public URL

### 2b. Support YouTube URL as a document of type `OTHER`

The FE will POST to `POST /v1/properties/:id/documents` with `type = OTHER`, `fileName = "youtube_url"`, and the YouTube URL as the document URL (no file binary, just the URL string).

**What to add:**
- Allow the document upload endpoint to accept a `url` field directly (no file) when `type = OTHER` and `fileName = "youtube_url"`
- Skip S3 upload in this case; store the provided URL directly in `PropertyDocument.url`
- Optionally validate that the URL matches a YouTube domain pattern

---

## Task 3 — Combined Yield + Report Endpoint (optional convenience route)

The frontend may call yield and report submission sequentially, but a combined endpoint would reduce round-trips.

Add: `POST /v1/properties/:id/yield-and-report`

**Request body:**
```json
{
  "yieldAmount": "1000000",         // raw USDC units, optional
  "yieldTx": "0x...",              // signed tx, optional (required if yieldAmount provided)
  "reportPeriodStart": "2025-01-01",  // optional
  "reportPeriodEnd":   "2025-03-31",  // optional
  "reportDescription": "Q1 report",   // optional
  "reportDocumentId":  "doc-cuid"     // optional, pre-uploaded document
}
```

**Behavior:**
1. If `yieldAmount` + `yieldTx` provided → submit yield (calls existing `submitYieldTx` logic)
2. If report fields provided → create report (calls existing `submitReport` logic)
3. Return combined result with both yield distribution id and report id

> Note: This is a convenience wrapper; the existing individual endpoints remain untouched.

---

## Task 4 — SLA Response Clarity

The SLA endpoint `GET /v1/properties/:id/sla` should return the BPS values in a way the frontend can directly compute proportions. Confirm or add:

**Response shape:**
```json
{
  "id": "...",
  "propertyId": "...",
  "yieldPeriodDays": 30,
  "reportPeriodDays": 30,
  "holderYieldBPS": 7000,
  "baselineYieldBPS": 2000,
  "platformFeeBPS": 1000,
  "nextReportDueAt": "...",
  "nextYieldDueAt": "..."
}
```

- Add a computed `platformFeeBPS` field in the service layer: `10000 - holderYieldBPS - baselineYieldBPS`
- This avoids the frontend having to calculate it and reduces risk of mismatch

---

## Task 5 — Portfolio Summary Completeness

The FE dashboard wires up `GET /v1/portfolio/:chainId`. Verify the response includes all fields the UI needs:

```json
{
  "holdings": [...],
  "totalValue": 27840.00,
  "totalInvested": 24500.00,
  "totalPendingYield": 340.00,
  "totalClaimedYield": 3000.00
}
```

- If `totalClaimedYield` is not currently returned, add it to the portfolio service aggregate query

---

## Checklist

### Task 1 — Thumbnail
- [x] Add `thumbnailDocumentId` + `thumbnailDocument` relation to Prisma schema
- [x] Run `bun run db:push`
- [x] Accept `thumbnailDocumentId` in `PATCH /v1/properties/:id` with FK validation
- [x] Include `thumbnailDocument: { id, url }` in property list/detail/my-properties responses

### Task 2 — Document Types
- [x] Confirm `IMAGE` type upload works end-to-end (multipart → S3 → URL stored)
- [x] Support `youtube_url` document: accept URL-only body (via `url` field), skip S3, validate YouTube domain

### Task 3 — Combined Endpoint
- [x] Add `POST /v1/properties/:id/yield-and-report/:chainId` route, schema, controller, service

### Task 4 — SLA Clarity
- [x] Return computed `platformFeeBPS` in SLA response

### Task 5 — Portfolio
- [x] `totalClaimedYield` already present in portfolio aggregate response — no changes needed

---

## Build & Lint
- `bun run db:push` after Prisma schema changes
- `bun run build` must pass with zero TypeScript errors
