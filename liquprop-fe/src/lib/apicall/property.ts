import axiosInstance from '../axios'
import { cached } from '../cache'

// ─── Types ──────────────────────────────────────────────────────────────────

export type BackendPropertyStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'REGISTERED'
  | 'TOKENIZED'
  | 'LISTED'
  | 'TOKEN_LIVE'
  | 'SUSPENDED'

export interface CreatePropertyInput {
  name: string
  description: string
  propertyType: string
  address: string
  latitude: number
  longitude: number
  totalAreaSqm?: number
  legalEntityName?: string
  legalRegistrationId?: string
  legalNotaryName?: string
  prospectusMarkdown?: string
  salePeriodStart?: string
  salePeriodEnd?: string
  targetFundUSD?: number
}

export interface SetSLAInput {
  yieldPeriodDays: number
  reportPeriodDays: number
  holderYieldBPS: number
  baselineYieldBPS: number
}

export interface SubmitYieldTxBody {
  txHash: string
  totalAmount: string
  holderAmount: string
  baselineAmount: string
  platformFee: string
}

export interface ApiProperty {
  id: string
  name: string
  description?: string
  propertyType: string
  address: string
  latitude: number
  longitude: number
  totalAreaSqm?: number
  legalEntityName?: string
  legalRegistrationId?: string
  legalNotaryName?: string
  prospectusMarkdown?: string
  salePeriodStart?: string
  salePeriodEnd?: string
  targetFundUSD?: number
  status: BackendPropertyStatus
  tokenId?: string
  thumbnailDocumentId?: string | null
  thumbnailDocument?: { id: string; url: string } | null
  createdAt?: string
  updatedAt?: string
  sla?: {
    id: string
    propertyId: string
    yieldPeriodDays: number
    reportPeriodDays: number
    holderYieldBPS: number
    baselineYieldBPS: number
    nextReportDueAt?: string | null
    nextYieldDueAt?: string | null
  }
}

export interface ApiDocument {
  id: string
  propertyId: string
  type: string
  fileName: string
  url: string
  createdAt?: string
}

export interface ApiSLA {
  id: string
  propertyId: string
  yieldPeriodDays: number
  reportPeriodDays: number
  holderYieldBPS: number
  baselineYieldBPS: number
  platformFeeBPS?: number
}

export interface UpdatePropertyInput {
  thumbnailDocumentId?: string | null
  status?: BackendPropertyStatus
  name?: string
  description?: string
  propertyType?: string
  address?: string
  latitude?: number
  longitude?: number
  totalAreaSqm?: number
  legalEntityName?: string
  legalRegistrationId?: string
  legalNotaryName?: string
  prospectusMarkdown?: string
  salePeriodStart?: string
  salePeriodEnd?: string
  targetFundUSD?: number
}

export interface SubmitYieldAndReportBody {
  yieldTxHash?: string
  totalAmount?: string
  holderAmount?: string
  baselineAmount?: string
  platformFee?: string
  reportPeriodStart?: string
  reportPeriodEnd?: string
  reportDescription?: string
  reportDocumentId?: string
}

export interface ApiReport {
  id: string
  propertyId: string
  reportPeriodStart: string
  reportPeriodEnd: string
  description?: string
  documents?: string[]
  onChainTxHash?: string
  submittedAt?: string
  createdAt?: string
}

export interface BlockchainTx {
  id: string
  propertyId: string
  chainId: string
  type: 'REGISTER_PROPERTY' | 'MINT_PRINCIPLE' | 'DISTRIBUTE_YIELD' | 'DEPLOY_GUARD' | 'SWAP_TOKEN'
  txHash: string
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  createdAt: string
  updatedAt: string
  chain?: {
    chainId: string
    name: string
    blockExplorerUrl?: string
  }
  property?: {
    id: string
    name: string
    address: string
  }
}

export interface YieldDistribution {
  id: string
  propertyId: string
  totalAmount: string
  holderAmount: string
  baselineAmount: string
  platformFee: string
  txHash?: string
  createdAt?: string
}

// ─── Property CRUD ───────────────────────────────────────────────────────────

export const createProperty = (body: CreatePropertyInput): Promise<ApiProperty> =>
  axiosInstance.post('/v1/properties', body).then(r => r.data ?? r)

// Property listings are slow-changing — cache for 30 seconds
export const listProperties = (page = 1, limit = 20): Promise<{ data: ApiProperty[]; total: number }> =>
  cached(`properties:list:${page}:${limit}`, 30_000, () =>
    axiosInstance.get(`/v1/properties?page=${page}&limit=${limit}`).then(r => r.data ?? r))

export const getProperty = (id: string): Promise<ApiProperty> =>
  cached(`properties:${id}`, 30_000, () =>
    axiosInstance.get(`/v1/properties/${id}`).then(r => r.data ?? r))

export const updateProperty = (id: string, body: UpdatePropertyInput): Promise<ApiProperty> =>
  axiosInstance.patch(`/v1/properties/${id}`, body).then(r => r.data ?? r)

export const getMyProperties = (page = 1, limit = 20): Promise<{ data: ApiProperty[]; total: number }> =>
  axiosInstance.get(`/v1/my/properties?page=${page}&limit=${limit}`).then(r => r.data ?? r)

// ─── Documents ───────────────────────────────────────────────────────────────

export const uploadDocument = (propertyId: string, file: File, type: string): Promise<ApiDocument> => {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  form.append('fileName', file.name)
  return axiosInstance.post(`/v1/properties/${propertyId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data ?? r)
}

export const uploadYoutubeUrl = (propertyId: string, youtubeUrl: string): Promise<ApiDocument> => {
  const form = new FormData()
  form.append('type', 'OTHER')
  form.append('fileName', 'youtube_url')
  form.append('url', youtubeUrl)
  return axiosInstance.post(`/v1/properties/${propertyId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data ?? r)
}

export const listDocuments = (propertyId: string): Promise<ApiDocument[]> =>
  axiosInstance.get(`/v1/properties/${propertyId}/documents`).then(r => r.data ?? r)

export const deleteDocument = (propertyId: string, docId: string): Promise<void> =>
  axiosInstance.delete(`/v1/properties/${propertyId}/documents/${docId}`).then(r => r.data ?? r)

// ─── SLA ─────────────────────────────────────────────────────────────────────

export const setSLA = (propertyId: string, body: SetSLAInput): Promise<ApiSLA> =>
  axiosInstance.post(`/v1/properties/${propertyId}/sla`, body).then(r => r.data ?? r)

export const getSLA = (propertyId: string): Promise<ApiSLA | null> =>
  axiosInstance.get(`/v1/properties/${propertyId}/sla`).then(r => (r as any)?.data ?? null)

// ─── Reports ─────────────────────────────────────────────────────────────────

export const submitReport = (propertyId: string, formData: FormData): Promise<ApiReport> =>
  axiosInstance.post(`/v1/properties/${propertyId}/reports`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data ?? r)

export const listReports = (propertyId: string): Promise<ApiReport[]> =>
  axiosInstance.get(`/v1/properties/${propertyId}/reports`).then(r => r.data ?? r)

// ─── Yield ───────────────────────────────────────────────────────────────────

export const createYieldTx = (propertyId: string, amount: string, chainId: string) =>
  axiosInstance.post(`/v1/properties/${propertyId}/yield/${chainId}/create-tx`, { amount }).then(r => r.data ?? r)

export const submitYieldTx = (propertyId: string, body: SubmitYieldTxBody, chainId: string) =>
  axiosInstance.post(`/v1/properties/${propertyId}/yield/${chainId}/submit`, body).then(r => r.data ?? r)

export const getYieldHistory = (propertyId: string): Promise<YieldDistribution[]> =>
  axiosInstance.get(`/v1/properties/${propertyId}/yield`).then(r => r.data ?? r)

export const listTransactions = (
  propertyId: string,
  params?: { type?: string; status?: string }
): Promise<BlockchainTx[]> => {
  const query = new URLSearchParams()
  if (params?.type) query.append('type', params.type)
  if (params?.status) query.append('status', params.status)
  const qs = query.toString() ? `?${query.toString()}` : ''

  return cached(`txs:${propertyId}:${qs}`, 15_000, () =>
    axiosInstance.get(`/v1/properties/${propertyId}/transactions${qs}`).then(r => r.data ?? r)
  )
}

export const getRecentTransactions = (limit = 15): Promise<BlockchainTx[]> =>
  axiosInstance.get(`/v1/properties/transactions/recent?limit=${limit}`).then(r => r.data?.data ?? r.data ?? r)

export const syncTransactions = (propertyId: string): Promise<BlockchainTx[]> =>
  axiosInstance.get(`/v1/properties/${propertyId}/transactions/sync`).then(r => r.data ?? r)

// ─── Registration ─────────────────────────────────────────────────────────────

export const createRegisterPropertyTx = (propertyId: string, metadataURI: string, chainId: string) =>
  axiosInstance.post(`/v1/properties/${propertyId}/register/${chainId}/create-tx`, { propertyId, metadataURI }).then(r => r.data ?? r)

export const submitRegisterProperty = (propertyId: string, txHash: string, chainId: string) =>
  axiosInstance.post(`/v1/properties/${propertyId}/register/${chainId}/submit`, { propertyId, txHash }).then(r => r.data ?? r)

// ─── Combined Yield + Report ──────────────────────────────────────────────────

export const submitYieldAndReport = (
  propertyId: string,
  body: SubmitYieldAndReportBody,
  chainId: string
): Promise<{ yieldTxHash?: string; reportId?: string }> =>
  axiosInstance.post(`/v1/properties/${propertyId}/yield-and-report/${chainId}`, body).then(r => r.data ?? r)

// ─── Subscription ─────────────────────────────────────────────────────────────

export const setSubscription = (propertyId: string, plan: 'MONTHLY' | 'YIELD_PERCENTAGE') =>
  axiosInstance.post('/v1/subscription', { propertyId, plan }).then(r => r.data ?? r)

export const getSubscription = (propertyId: string): Promise<{ plan: 'MONTHLY' | 'YIELD_PERCENTAGE' } | null> =>
  axiosInstance.get(`/v1/subscription/${propertyId}`).then(r => (r as any)?.data ?? null)

// ─── Minting ──────────────────────────────────────────────────────────────────

export interface MintPrincipleInput {
  propertyId: string
  from: string
  totalSupply: number
  presaleAmount: number
  deadline: number
  tokenId: number
  presalePrice: number
}

export const createMintPrincipleTx = (chainId: string, body: MintPrincipleInput) =>
  axiosInstance.post(`/v1/mint/${chainId}/create-mint-principle-tx`, body).then(r => r.data ?? r)

export const createApproveMintPrincipleTx = (chainId: string, body: { tokenId: number; from: string }) =>
  axiosInstance.post(`/v1/mint/${chainId}/create-approve-mint-principle-tx`, body).then(r => r.data ?? r)

export const submitMintPrinciple = (propertyId: string, chainId: string, txHash: string) =>
  axiosInstance.post(`/v1/mint/${chainId}/submit-mint-principle`, { propertyId, txHash }).then(r => r.data ?? r)

// ─── Guard ────────────────────────────────────────────────────────────────────

export const submitDeployGuardTx = (propertyId: string, txHash: string, chainId: string) =>
  axiosInstance.post(`/v1/properties/${propertyId}/deploy-guard/${chainId}/submit`, { txHash }).then(r => r.data ?? r)

export const submitSwapTx = (propertyId: string, txHash: string, chainId: string) =>
  axiosInstance.post(`/v1/properties/${propertyId}/swap/${chainId}/submit`, { txHash }).then(r => r.data ?? r)

// ─── Asset Upload (pre-upload before property creation) ───────────────────────

export const uploadAsset = (file: File, type: string): Promise<ApiDocument> => {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  return axiosInstance.post('/v1/assets/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data?.data ?? r.data ?? r)
}

// ─── Single atomic property creation ─────────────────────────────────────────

export interface CreatePropertyFullInput {
  name: string
  description: string
  propertyType: string
  address: string
  latitude: number
  longitude: number
  totalAreaSqm?: number
  legalEntityName?: string
  legalRegistrationId?: string
  legalNotaryName?: string
  prospectusMarkdown?: string
  salePeriodStart?: string
  salePeriodEnd?: string
  targetFundUSD?: number
  documentIds?: string[]
  thumbnailDocumentId?: string | null
  youtubeUrl?: string
  subscriptionPlan: 'MONTHLY' | 'YIELD_PERCENTAGE'
  sla: {
    yieldPeriodDays: number
    reportPeriodDays: number
    holderYieldBPS: number
    baselineYieldBPS: number
  }
  publishNow?: boolean
}

export const createPropertyFull = (body: CreatePropertyFullInput): Promise<ApiProperty> =>
  axiosInstance.post('/v1/properties/create-full', body).then(r => r.data?.data ?? r.data ?? r)

