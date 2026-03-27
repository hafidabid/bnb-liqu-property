const GQL_URL = () => process.env.INDEXER_GQL_URL ?? 'http://localhost:42069/graphql'

const gql = async (query: string, variables: Record<string, unknown> = {}) => {
  const res = await fetch(GQL_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Indexer error: ${res.status}`)
  const json = (await res.json()) as { data?: Record<string, unknown>; errors?: unknown[] }
  if (json.errors) throw new Error(`Indexer GQL error: ${JSON.stringify(json.errors)}`)

  return json.data
}

export const getRegisteredProperties = async (after?: string, limit = 20) => {
  const data = await gql(
    `query GetRegisteredProperties($limit: Int, $after: String) {
      propertyRegistereds(limit: $limit, after: $after, orderBy: "blockTimestamp", orderDirection: "desc") {
        items {
          id
          owner
          tokenId
          metadataURI
          blockTimestamp
          transactionHash
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    { limit, after }
  )
  const result = data?.propertyRegisteredItems as any

  return { items: result?.items ?? [], pageInfo: result?.pageInfo ?? {} }
}

export const getRegisteredPropertyById = async (tokenId: string) => {
  const data = await gql(
    `query GetPropertyById($tokenId: BigInt!) {
      propertyRegistereds(where: { tokenId: $tokenId }, limit: 1) {
        items {
          id
          owner
          tokenId
          metadataURI
          blockTimestamp
          transactionHash
        }
      }
    }`,
    { tokenId }
  )
  const items = (data?.propertyRegisteredItems as any)?.items ?? []

  return items[0] ?? null
}

export const getYieldHistory = async (tokenId: string) => {
  const data = await gql(
    `query GetYieldHistory($tokenId: BigInt!) {
      yieldDistributeds(where: { tokenId: $tokenId }, orderBy: "blockTimestamp", orderDirection: "desc") {
        items {
          id
          tokenId
          holderShare
          baselineShare
          platformShare
          blockTimestamp
          transactionHash
        }
      }
    }`,
    { tokenId }
  )

  return (data?.yieldDistributedItems as any)?.items ?? []
}

export const getReports = async (tokenId: string) => {
  const data = await gql(
    `query GetReports($tokenId: BigInt!) {
      reportAcknowledgeds(where: { tokenId: $tokenId }, orderBy: "blockTimestamp", orderDirection: "desc") {
        items {
          id
          tokenId
          blockTimestamp
          transactionHash
        }
      }
    }`,
    { tokenId }
  )

  return (data?.reportAcknowledgedItems as any)?.items ?? []
}

export const getMintPrincipleByTokenId = async (tokenId: string) => {
  const data = await gql(
    `query GetMintPrinciple($tokenId: BigInt!) {
      mintPrinciples(where: { tokenId: $tokenId }, limit: 1) {
        items {
          id
          tokenId
          mintAmount
          presaleAmount
          blockTimestamp
          transactionHash
        }
      }
    }`,
    { tokenId }
  )
  const items = (data?.mintPrinciples as any)?.items ?? []

  return items[0] ?? null
}

export const getRegistered = async (propertyDbId: string) => {
  const data = await gql(
    `query GetRegistered($propertyDbId: String!) {
      propertyRegistereds(where: { metadataURI_contains: $propertyDbId }, limit: 1) {
        items {
          id
          owner
          tokenId
          metadataURI
          blockTimestamp
          transactionHash
        }
      }
    }`,
    { propertyDbId }
  )
  const items = (data?.propertyRegistereds as any)?.items ?? []

  return items[0] ?? null
}

export const getPresaleSummaryByTokenId = async (tokenId: string) => {
  const data = await gql(
    `query GetPresaleSummary($tokenId: BigInt!) {
      presaleBoughtItems(where: { tokenId: $tokenId }, orderBy: "blockTimestamp", orderDirection: "desc") {
        items {
          id
          tokenId
          buyer
          amount
          blockTimestamp
          transactionHash
        }
      }
    }`,
    { tokenId }
  )
  const items = (data?.presaleBoughtItems as any)?.items ?? []
  const totalBought = items.reduce((acc: number, item: any) => acc + Number(item.amount ?? 0), 0)

  return { totalBought, buyers: items }
}

export const getPlatformFees = async (tokenId: string) => {
  const data = await gql(
    `query GetPlatformFees($tokenId: BigInt!) {
      platformFeeMintedItems(where: { tokenId: $tokenId }, limit: 1) {
        items {
            id
            tokenId
            amount
            blockTimestamp
            transactionHash
            blockNumber
            logIndex
            transactionIndex
            treasury
        }
      }
    }`,
    { tokenId }
  )
  const items = (data?.platformFeeMintedItems as any)?.items ?? []

  return items[0] ?? null
}

export const getDeployGuardByTxHash = async (txHash: string) => {
  const data = await gql(
    `query GetDeployGuardByTxHash($txHash: String!) {
      deployGuards(where: { transactionHash: $txHash }, limit: 1) {
        items {
          id
          guard
          yield
          blockTimestamp
          transactionHash
        }
      }
    }`,
    { txHash }
  )
  const items = (data?.deployGuards as any)?.items ?? []

  return items[0] ?? null
}
