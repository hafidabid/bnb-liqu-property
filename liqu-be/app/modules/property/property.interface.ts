import { DocumentType, PropertyStatus, SubscriptionPlan } from '@prisma/client'

export { PropertyStatus }

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

export interface UpdatePropertyInput {
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
  metadataURI?: string
  thumbnailDocumentId?: string | null
  status?: PropertyStatus
}

export interface ListPropertiesQuery {
  page?: number
  limit?: number
  status?: PropertyStatus
}

export interface SetSLAInput {
  yieldPeriodDays: number
  reportPeriodDays: number
  holderYieldBPS: number
  baselineYieldBPS: number
}

export interface SubmitReportInput {
  reportPeriodStart: string
  reportPeriodEnd: string
  description?: string
  onChainTxHash?: string
}

export interface CreateYieldTxInput {
  amount: string
}

export interface SubmitYieldTxInput {
  txHash: `0x${string}`
  totalAmount: string
  holderAmount: string
  baselineAmount: string
  platformFee: string
}

export interface RegisterPropertyTxInput {
  metadataURI: string
}

export interface SubmitRegisterPropertyInput {
  txHash: `0x${string}`
}

export interface SetSubscriptionInput {
  propertyId: string
  plan: SubscriptionPlan
}

export interface DocumentUpload {
  type: DocumentType
  fileName: string
  buffer: Buffer
  contentType: string
}

export interface SubmitYieldAndReportInput {
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

export interface SubmitDeployGuardTxInput {
  txHash: `0x${string}`
}
