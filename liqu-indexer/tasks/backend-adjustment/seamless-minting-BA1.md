# BA1 — Backend Adjustment Notes (from Indexer)
# Level: Cross-App

## Context
The indexer now indexes 4 new event tables from BA1. The backend should expose these as REST endpoints by querying the indexer's GraphQL API (`/graphql`). These endpoints serve the frontend and internal analytics.

---

## Indexer GraphQL Base URL

```
http://<INDEXER_HOST>:42069/graphql
```

Ponder auto-generates a GraphQL schema from `ponder.schema.ts`. All tables below are queryable out of the box.

---

## New Tables Available via GraphQL

| Table | Description |
|-------|-------------|
| `propertyRegistered` | On-chain property registrations (`registerProperty()`) |
| `platformFeeMinted` | Platform fee ERC1155 mints at tokenization time |
| `yieldDistributed` | Yield distributions by property owners |
| `reportAcknowledged` | On-chain report SLA acknowledgements |

---

## Required Backend REST Endpoints

Create these endpoints in the backend. Each one issues a GraphQL query to the indexer and returns the result as JSON.

---

### 1. `GET /v1/indexer/properties/registered`

Returns all on-chain registered properties, paginated.

**GraphQL query to indexer:**
```graphql
query PropertiesRegistered($limit: Int, $after: String) {
  propertyRegisteredItems(
    limit: $limit
    after: $after
    orderBy: "blockTimestamp"
    orderDirection: "desc"
  ) {
    items {
      id
      owner
      tokenId
      metadataURI
      transactionHash
      blockNumber
      blockTimestamp
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Use case:** Sync with backend `Property` DB — when an event appears here but is missing in the DB, create or update the record (set `tokenId`, transition status to `REGISTERED`).

---

### 2. `GET /v1/indexer/properties/registered/:tokenId`

Returns the registration record for a single property token.

**GraphQL query to indexer:**
```graphql
query PropertyRegisteredById($tokenId: String!) {
  propertyRegisteredItems(where: { tokenId: $tokenId }) {
    items {
      id
      owner
      tokenId
      metadataURI
      transactionHash
      blockTimestamp
    }
  }
}
```

---

### 3. `GET /v1/indexer/yield-history/:tokenId`

Returns full yield distribution history for a property, ordered newest first.

**GraphQL query to indexer:**
```graphql
query YieldHistory($tokenId: String!, $limit: Int, $after: String) {
  yieldDistributedItems(
    where: { tokenId: $tokenId }
    limit: $limit
    after: $after
    orderBy: "distributedAt"
    orderDirection: "desc"
  ) {
    items {
      id
      tokenId
      holderShare
      baselineShare
      platformShare
      distributedAt
      transactionHash
      blockTimestamp
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Use case:** Display yield history on property detail page; create `YieldDistribution` DB records for analytics.

---

### 4. `GET /v1/indexer/reports/:tokenId`

Returns on-chain report acknowledgements for a property.

**GraphQL query to indexer:**
```graphql
query Reports($tokenId: String!, $limit: Int, $after: String) {
  reportAcknowledgedItems(
    where: { tokenId: $tokenId }
    limit: $limit
    after: $after
    orderBy: "acknowledgedAt"
    orderDirection: "desc"
  ) {
    items {
      id
      tokenId
      acknowledgedAt
      transactionHash
      blockTimestamp
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Use case:** Confirm that an on-chain report ack exists before allowing the next `distributeYield` tx; update `PropertySLA.nextReportDueAt`.

---

### 5. `GET /v1/indexer/platform-fees/:tokenId`

Returns the platform fee mint record for a tokenized property.

**GraphQL query to indexer:**
```graphql
query PlatformFee($tokenId: String!) {
  platformFeeMintedItems(where: { tokenId: $tokenId }) {
    items {
      id
      treasury
      tokenId
      amount
      transactionHash
      blockTimestamp
    }
  }
}
```

**Use case:** Confirm tokenization happened on-chain; transition property status to `TOKENIZED`.

---

## Implementation Notes

- All `tokenId` values are `bigint` on-chain — pass them as strings in GraphQL variables (e.g. `"1"`)
- All amounts (`holderShare`, `baselineShare`, `platformShare`, `amount`) are raw token units — divide by `1e6` for USDC display
- Timestamps (`distributedAt`, `acknowledgedAt`, `blockTimestamp`) are Unix seconds
- Pagination uses cursor-based `after` + `hasNextPage` pattern (Ponder standard)
- Backend should cache responses with a short TTL (e.g. 15s) since the indexer lags behind by a few blocks
- Environment variable needed: `INDEXER_GQL_URL=http://<host>:42069/graphql`
