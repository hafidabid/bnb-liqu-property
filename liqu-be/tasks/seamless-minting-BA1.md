# ✅ Business Adjustment 1 — Backend Tasks
# Level: Application

## Context
Enable anyone (personal or organization) to list, tokenize, and manage their property through the platform. Currently minting is admin-only. This task introduces a full property listing flow, document management, yield distribution, report SLA enforcement, subscription billing model, and backend dockerization.

---

## Tasks

### 1. Database Schema — New Prisma Models ✅

Add the following models to `prisma/schema.prisma`:

#### `Property` ✅
```prisma
model Property {
  id                 String            @id @default(cuid())
  ownerAddress       String            // wallet address of the property poster
  tokenId            BigInt?           // set after on-chain registration
  metadataURI        String?           // IPFS / hosted URL of metadata JSON
  name               String
  description        String?
  propertyType       String            // "residential" | "commercial" | "agricultural" | etc.
  address            String            // human-readable address
  latitude           Float
  longitude          Float
  totalAreaSqm       Float?
  legalEntityName    String?
  legalRegistrationId String?
  status             PropertyStatus    @default(DRAFT)
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  documents          PropertyDocument[]
  sla                PropertySLA?
  yieldDistributions YieldDistribution[]
  reports            PropertyReport[]
  subscription       PlatformSubscription?

  @@index([ownerAddress])
  @@index([tokenId])
}

enum PropertyStatus {
  DRAFT           // created off-chain, not submitted yet
  PENDING_REVIEW  // submitted for admin review (pre-on-chain)
  REGISTERED      // on-chain registered, ERC721 minted
  TOKENIZED       // mintPrinciple() called, ERC1155 fractions live
  LISTED          // available for presale/secondary
  SUSPENDED       // SLA breached or fraud flag
}
```

#### `PropertyDocument` ✅
#### `PropertySLA` ✅
#### `YieldDistribution` ✅
#### `PropertyReport` ✅
#### `PlatformSubscription` ✅

---

### 2. New API Routes ✅

Created `app/modules/property/` and `app/modules/subscription/` following the existing MVC pattern.

#### Property Listing ✅
| Method | Path | Auth | Status |
|--------|------|------|--------|
| `POST` | `/v1/properties` | JWT | ✅ |
| `GET` | `/v1/properties` | Public | ✅ |
| `GET` | `/v1/properties/:id` | Public | ✅ |
| `PATCH` | `/v1/properties/:id` | JWT (owner) | ✅ |
| `GET` | `/v1/my/properties` | JWT | ✅ |

#### Document Upload ✅
| Method | Path | Auth | Status |
|--------|------|------|--------|
| `POST` | `/v1/properties/:id/documents` | JWT (owner) | ✅ |
| `GET` | `/v1/properties/:id/documents` | Public | ✅ |
| `DELETE` | `/v1/properties/:id/documents/:docId` | JWT (owner) | ✅ |

#### On-Chain Registration & Minting ✅
| Method | Path | Auth | Status |
|--------|------|------|--------|
| `POST` | `/v1/create-register-property-tx` | JWT (owner) | ✅ |
| `POST` | `/v1/submit-register-property` | JWT (owner) | ✅ |

#### SLA Setup ✅
| Method | Path | Auth | Status |
|--------|------|------|--------|
| `POST` | `/v1/properties/:id/sla` | JWT (owner) | ✅ |
| `GET` | `/v1/properties/:id/sla` | Public | ✅ |

#### Reports ✅
| Method | Path | Auth | Status |
|--------|------|------|--------|
| `POST` | `/v1/properties/:id/reports` | JWT (owner) | ✅ |
| `GET` | `/v1/properties/:id/reports` | Public | ✅ |

#### Yield Distribution ✅
| Method | Path | Auth | Status |
|--------|------|------|--------|
| `POST` | `/v1/properties/:id/yield/create-tx` | JWT (owner) | ✅ |
| `POST` | `/v1/properties/:id/yield/submit` | JWT (owner) | ✅ |
| `GET` | `/v1/properties/:id/yield` | Public | ✅ |

#### Subscription ✅
| Method | Path | Auth | Status |
|--------|------|------|--------|
| `POST` | `/v1/subscription` | JWT | ✅ |
| `GET` | `/v1/subscription/:propertyId` | JWT (owner) | ✅ |

---

### 3. File Storage Integration ✅

- [x] Integrated S3-compatible file storage (`app/services/storage/s3.ts`)
- [x] Supports AWS S3, Cloudflare R2, MinIO via env vars
- [x] Added `@fastify/multipart` plugin (registered in `index.ts`)
- [x] URLs stored in `PropertyDocument.url`
- [x] New env vars: `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION`, `STORAGE_PUBLIC_URL`

---

### 4. Map / Location Validation ✅

- [x] `POST /v1/properties` validates `latitude` in `[-90, 90]` and `longitude` in `[-180, 180]`

---

### 5. Business Model Enforcement ✅

- [x] `isSubscriptionActive(propertyId)` utility checks MONTHLY `activeUntil` or YIELD_PERCENTAGE
- [x] `createYieldTx` enforces active subscription before building tx
- [x] Admin endpoint `PATCH /v1/subscription/admin/:propertyId/extend` to extend monthly subscriptions

---

### 6. Dockerization ✅

- [x] `Dockerfile` created (node:20-alpine, bun install, tsc build)
- [x] `docker-compose.yml` created (be + postgres:16-alpine services)
- [x] `.dockerignore` created

---

### 7. Cross-App Dependencies ✅

- [x] `liqu-be/tasks/fe-action/seamless-minting-BA1.md` updated with full detailed frontend spec

---

### 8. Indexer Integration ✅

Created `app/modules/indexer/` module:

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/v1/indexer/properties/registered` | ✅ |
| `GET` | `/v1/indexer/properties/registered/:tokenId` | ✅ |
| `GET` | `/v1/indexer/yield-history/:tokenId` | ✅ |
| `GET` | `/v1/indexer/reports/:tokenId` | ✅ |
| `GET` | `/v1/indexer/platform-fees/:tokenId` | ✅ |

- [x] Thin GraphQL proxy using native `fetch`
- [x] `INDEXER_GQL_URL` env var added to docker-compose

---

## Build & Lint
- Run `bun install` first (adds `@aws-sdk/client-s3`, `@fastify/multipart`)
- Run `bun run db:push` to apply new Prisma models
- `bun run build` must succeed with zero TypeScript errors
