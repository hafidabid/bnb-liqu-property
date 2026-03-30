import prisma from '#prisma/prisma'
import publicClient from '#app/services/contracts/client/publicClient'
import { uploadFile } from '#app/services/storage/s3'
import { getRegisteredProperties, getMintPrincipleByTokenId, getRegistered, getDeployGuardByTxHash } from '../indexer/indexer.service.js'
import { createRegisterPropertyTx as buildRegisterTx } from '#app/services/contracts/lib/property/registerProperty'
import { createDistributeYieldTx as buildYieldTx } from '#app/services/contracts/lib/property/distributeYield'
import { DocumentType, PropertyStatus, TxType } from '@prisma/client'
import {
  CreatePropertyInput,
  UpdatePropertyInput,
  SetSLAInput,
  SubmitRegisterPropertyInput,
  RegisterPropertyTxInput,
  CreateYieldTxInput,
  SubmitYieldTxInput,
  SubmitYieldAndReportInput,
  SubmitDeployGuardTxInput,
  CreatePropertyFullInput,
} from './property.interface.js'

export const createProperty = async (
  input: CreatePropertyInput,
  ownerAddress: string
) => {
  if (input.latitude < -90 || input.latitude > 90)
    throw new Error('latitude must be between -90 and 90')
  if (input.longitude < -180 || input.longitude > 180)
    throw new Error('longitude must be between -180 and 180')

  // make sure not duplicate property
  const existingProperty = await prisma.property.findFirst({
    where: { ownerAddress: ownerAddress.toLowerCase(), name: input.name },
  })
  if (existingProperty) throw new Error('Property already exists')

  await prisma.user.upsert({
    where: { walletAddress: ownerAddress.toLowerCase() },
    update: {},
    create: { walletAddress: ownerAddress.toLowerCase() },
  })

  return prisma.property.create({
    data: {
      ownerAddress: ownerAddress.toLowerCase(),
      name: input.name,
      description: input.description,
      propertyType: input.propertyType,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      totalAreaSqm: input.totalAreaSqm,
      legalEntityName: input.legalEntityName,
      legalRegistrationId: input.legalRegistrationId,
      legalNotaryName: input.legalNotaryName,
      prospectusMarkdown: input.prospectusMarkdown,
      salePeriodStart: input.salePeriodStart ? new Date(input.salePeriodStart) : undefined,
      salePeriodEnd: input.salePeriodEnd ? new Date(input.salePeriodEnd) : undefined,
      targetFundUSD: input.targetFundUSD,
    },
  })
}

// ─── Atomic full-property creation (single endpoint) ─────────────────────────

const YOUTUBE_PATTERN_SVC = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//

export const createPropertyFull = async (
  input: CreatePropertyFullInput,
  ownerAddress: string
) => {
  if (input.latitude < -90 || input.latitude > 90)
    throw new Error('latitude must be between -90 and 90')
  if (input.longitude < -180 || input.longitude > 180)
    throw new Error('longitude must be between -180 and 180')

  // Duplicate check (outside transaction — fast fail)
  const existing = await prisma.property.findFirst({
    where: { ownerAddress: ownerAddress.toLowerCase(), name: input.name },
  })
  if (existing) throw new Error('Property already exists')

  // Validate BPS before entering transaction
  const platformBPS = input.subscriptionPlan === 'MONTHLY' ? 0 : 300
  const maxAllowed = 10000 - platformBPS
  if ((input.sla.holderYieldBPS + input.sla.baselineYieldBPS) > maxAllowed)
    throw new Error(
      `holderYieldBPS + baselineYieldBPS must not exceed ${maxAllowed} for the selected subscription plan`
    )

  return prisma.$transaction(async (tx) => {
    // 1. Upsert user
    await tx.user.upsert({
      where: { walletAddress: ownerAddress.toLowerCase() },
      update: {},
      create: { walletAddress: ownerAddress.toLowerCase() },
    })

    // 2. Create property
    const property = await tx.property.create({
      data: {
        ownerAddress: ownerAddress.toLowerCase(),
        name: input.name,
        description: input.description,
        propertyType: input.propertyType,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        totalAreaSqm: input.totalAreaSqm,
        legalEntityName: input.legalEntityName,
        legalRegistrationId: input.legalRegistrationId,
        legalNotaryName: input.legalNotaryName,
        prospectusMarkdown: input.prospectusMarkdown,
        salePeriodStart: input.salePeriodStart ? new Date(input.salePeriodStart) : undefined,
        salePeriodEnd: input.salePeriodEnd ? new Date(input.salePeriodEnd) : undefined,
        targetFundUSD: input.targetFundUSD,
        status: input.publishNow ? PropertyStatus.PENDING_REVIEW : PropertyStatus.DRAFT,
      },
    })

    // 3. Create subscription
    await tx.platformSubscription.create({
      data: {
        propertyId: property.id,
        ownerAddress: ownerAddress.toLowerCase(),
        plan: input.subscriptionPlan,
      },
    })

    // 4. Create SLA
    await tx.propertySLA.create({
      data: {
        propertyId: property.id,
        yieldPeriodDays: input.sla.yieldPeriodDays,
        reportPeriodDays: input.sla.reportPeriodDays,
        holderYieldBPS: input.sla.holderYieldBPS,
        baselineYieldBPS: input.sla.baselineYieldBPS,
      },
    })

    // 5. Link pre-uploaded document assets to this property
    if (input.documentIds && input.documentIds.length > 0) {
      await tx.propertyDocument.updateMany({
        where: {
          id: { in: input.documentIds },
          propertyId: null, // only link orphan docs (prevent hijacking)
        },
        data: { propertyId: property.id },
      })
    }

    // 6. Set thumbnail if provided
    if (input.thumbnailDocumentId) {
      await tx.property.update({
        where: { id: property.id },
        data: { thumbnailDocumentId: input.thumbnailDocumentId },
      })
    }

    // 7. YouTube URL as a document
    if (input.youtubeUrl && YOUTUBE_PATTERN_SVC.test(input.youtubeUrl)) {
      await tx.propertyDocument.create({
        data: {
          propertyId: property.id,
          type: 'OTHER',
          fileName: 'youtube_url',
          url: input.youtubeUrl,
        },
      })
    }

    // Return full property with relations
    return tx.property.findUnique({
      where: { id: property.id },
      include: {
        documents: true,
        sla: true,
        subscription: true,
        thumbnailDocument: { select: { id: true, url: true } },
      },
    })
  })
}


export const listProperties = async (page = 1, limit = 20) => {
  return prisma.property.paginate({
    page,
    limit,
    where: { status: { in: [PropertyStatus.TOKENIZED, PropertyStatus.LISTED, PropertyStatus.TOKEN_LIVE] } },
    orderBy: { createdAt: 'desc' },
    include: {
      sla: true,
      documents: { where: { type: 'IMAGE' } },
      thumbnailDocument: { select: { id: true, url: true } },
    },
  })
}

export const getProperty = async (id: string) => {
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      sla: true,
      documents: true,
      subscription: true,
      thumbnailDocument: { select: { id: true, url: true } },
    },
  })
  if (!property) throw new Error('Property not found')

  return property
}

export const updateProperty = async (
  id: string,
  input: UpdatePropertyInput,
  ownerAddress: string
) => {
  const property = await prisma.property.findUnique({ where: { id } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')

  const { thumbnailDocumentId, status, ...rest } = input

  // Validate thumbnail FK — must belong to this property (allowed on any status)
  if (thumbnailDocumentId !== undefined && thumbnailDocumentId !== null) {
    const doc = await prisma.propertyDocument.findUnique({ where: { id: thumbnailDocumentId } })
    if (!doc || doc.propertyId !== id)
      throw new Error('thumbnailDocumentId does not belong to this property')
  }

  // Validate status transition — only DRAFT → PENDING_REVIEW allowed by owner
  if (status !== undefined) {
    if (property.status !== PropertyStatus.DRAFT || status !== PropertyStatus.PENDING_REVIEW)
      throw new Error('Only DRAFT → PENDING_REVIEW transition is allowed')
  }

  // Remaining fields require DRAFT status
  if (Object.keys(rest).length > 0 && ![PropertyStatus.DRAFT.toString(), PropertyStatus.REGISTERED.toString()].includes(property.status.toString()))
    throw new Error('Only DRAFT and REGISTERED properties can be updated')

  if (rest.latitude !== undefined && (rest.latitude < -90 || rest.latitude > 90))
    throw new Error('latitude must be between -90 and 90')
  if (rest.longitude !== undefined && (rest.longitude < -180 || rest.longitude > 180))
    throw new Error('longitude must be between -180 and 180')

  const updateData: Record<string, unknown> = { ...rest }
  if (thumbnailDocumentId !== undefined) updateData.thumbnailDocumentId = thumbnailDocumentId
  if (status !== undefined) updateData.status = status

  return prisma.property.update({ where: { id }, data: updateData })
}

export const getMyProperties = async (ownerAddress: string, page = 1, limit = 20) => {
  return prisma.property.paginate({
    page,
    limit,
    where: { ownerAddress: ownerAddress.toLowerCase() },
    orderBy: { createdAt: 'desc' },
    include: {
      sla: true,
      subscription: true,
      thumbnailDocument: { select: { id: true, url: true } },
    },
  })
}

const YOUTUBE_PATTERN = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//

export const uploadDocument = async (
  propertyId: string,
  ownerAddress: string,
  type: DocumentType,
  fileName: string,
  bufferOrUrl: Buffer | string,
  contentType: string
) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')

  let url: string
  if (typeof bufferOrUrl === 'string') {
    // Direct URL — validate YouTube links
    if (fileName === 'youtube_url' && !YOUTUBE_PATTERN.test(bufferOrUrl))
      throw new Error('Invalid YouTube URL')
    url = bufferOrUrl
  } else {
    const key = `properties/${propertyId}/${Date.now()}-${fileName}`
    url = await uploadFile(bufferOrUrl, key, contentType)
  }

  return prisma.propertyDocument.create({
    data: { propertyId, type, fileName, url },
  })
}

export const listDocuments = (propertyId: string) => {
  return prisma.propertyDocument.findMany({
    where: { propertyId },
    orderBy: { uploadedAt: 'desc' },
  })
}

export const deleteDocument = async (
  propertyId: string,
  docId: string,
  ownerAddress: string
) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')
  if (property.status !== PropertyStatus.DRAFT)
    throw new Error('Documents can only be deleted on DRAFT properties')

  await prisma.propertyDocument.delete({ where: { id: docId, propertyId } })
}

export const setSLA = async (
  propertyId: string,
  input: SetSLAInput,
  ownerAddress: string
) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')

  const { holderYieldBPS, baselineYieldBPS } = input

  // Platform BPS is 0 for MONTHLY (paid via flat fee) and 300 (3%) for YIELD_PERCENTAGE
  const sub = await prisma.platformSubscription.findUnique({ where: { propertyId } })
  const platformBPS = sub?.plan === 'MONTHLY' ? 0 : 300
  const maxAllowed = 10000 - platformBPS
  if (holderYieldBPS + baselineYieldBPS > maxAllowed)
    throw new Error(`holderYieldBPS + baselineYieldBPS must not exceed ${maxAllowed} for the selected subscription plan`)

  return prisma.propertySLA.upsert({
    where: { propertyId },
    update: { ...input },
    create: { propertyId, ...input },
  })
}

export const getSLA = async (propertyId: string) => {
  const sla = await prisma.propertySLA.findUnique({ where: { propertyId } })
  if (!sla) return null

  return {
    ...sla,
    platformFeeBPS: 10000 - sla.holderYieldBPS - sla.baselineYieldBPS,
  }
}

export const submitReport = async (
  propertyId: string,
  ownerAddress: string,
  reportPeriodStart: string,
  reportPeriodEnd: string,
  description: string | undefined,
  onChainTxHash: string | undefined,
  docBuffers: Array<{ buffer: Buffer; fileName: string; contentType: string }>
) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')

  const docUrls: string[] = []
  for (const { buffer, fileName, contentType } of docBuffers) {
    const key = `properties/${propertyId}/reports/${Date.now()}-${fileName}`
    const url = await uploadFile(buffer, key, contentType)
    docUrls.push(url)
  }

  const report = await prisma.propertyReport.create({
    data: {
      propertyId,
      reportPeriodStart: new Date(reportPeriodStart),
      reportPeriodEnd: new Date(reportPeriodEnd),
      description,
      documents: docUrls,
      onChainTxHash,
    },
  })

  // Update nextReportDueAt on SLA if exists
  const sla = await prisma.propertySLA.findUnique({ where: { propertyId } })
  if (sla) {
    const nextDue = new Date()
    nextDue.setDate(nextDue.getDate() + sla.reportPeriodDays)
    await prisma.propertySLA.update({
      where: { propertyId },
      data: { nextReportDueAt: nextDue },
    })
  }

  return report
}

export const listReports = (propertyId: string) => {
  return prisma.propertyReport.findMany({
    where: { propertyId },
    orderBy: { submittedAt: 'desc' },
  })
}

export const isSubscriptionActive = async (propertyId: string): Promise<boolean> => {
  const sub = await prisma.platformSubscription.findUnique({ where: { propertyId } })
  if (!sub) return false
  if (sub.plan === 'YIELD_PERCENTAGE') return true
  if (!sub.activeUntil) return false

  return sub.activeUntil > new Date()
}

export const createYieldTx = async (
  propertyId: string,
  ownerAddress: string,
  input: CreateYieldTxInput,
  chainId: string
) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { sla: true },
  })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')
  if (!property.tokenId) throw new Error('Property has no tokenId — register on-chain first')

  const active = await isSubscriptionActive(propertyId)
  if (!active) throw new Error('No active subscription — choose a plan first')

  if (property.sla?.nextReportDueAt && property.sla.nextReportDueAt < new Date())
    throw new Error('Report SLA breached — submit a report before distributing yield')

  const contract = await prisma.contract.findFirst({
    where: {
      contractName: 'CH_PT',
      chainId
    },
    include: {
      chain: true
    }
  })

  if (!contract) throw new Error('Contract not found')

  const tx = await buildYieldTx(
    property.tokenId,
    BigInt(input.amount),
    ownerAddress as `0x${string}`,
    contract
  )

  return tx
}

export const submitYieldTx = async (
  propertyId: string,
  ownerAddress: string,
  input: SubmitYieldTxInput,
  chainId: string
) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')
  if (!property.tokenId) throw new Error('Property has no tokenId')

  const txHash = input.txHash

  await prisma.yieldDistribution.create({
    data: {
      propertyId,
      tokenId: property.tokenId,
      totalAmount: input.totalAmount,
      holderAmount: input.holderAmount,
      baselineAmount: input.baselineAmount,
      platformFee: input.platformFee,
      txHash,
    },
  })

  await prisma.blockchainTransaction.create({
    data: { propertyId, chainId, type: TxType.DISTRIBUTE_YIELD, txHash },
  })

  // Update nextYieldDueAt
  const sla = await prisma.propertySLA.findUnique({ where: { propertyId } })
  if (sla) {
    const nextDue = new Date()
    nextDue.setDate(nextDue.getDate() + sla.yieldPeriodDays)
    await prisma.propertySLA.update({
      where: { propertyId },
      data: { nextYieldDueAt: nextDue },
    })
  }

  return txHash
}

export const getYieldHistory = (propertyId: string) => {
  return prisma.yieldDistribution.findMany({
    where: { propertyId },
    orderBy: { distributedAt: 'desc' },
  })
}

export const submitYieldAndReport = async (
  propertyId: string,
  ownerAddress: string,
  input: SubmitYieldAndReportInput,
  chainId: string
) => {
  const hasYield = !!(input.yieldTxHash && input.totalAmount)
  const hasReport = !!(input.reportPeriodStart && input.reportPeriodEnd)

  if (!hasYield && !hasReport)
    throw new Error('Provide at least yield tx fields or report period fields')

  const result: { yieldTxHash?: string; reportId?: string } = {}

  if (hasYield) {
    const txHash = await submitYieldTx(
      propertyId,
      ownerAddress,
      {
        txHash: input.yieldTxHash as `0x${string}`,
        totalAmount: input.totalAmount!,
        holderAmount: input.holderAmount!,
        baselineAmount: input.baselineAmount!,
        platformFee: input.platformFee!,
      },
      chainId
    )
    result.yieldTxHash = txHash
  }

  if (hasReport) {
    const docUrls: string[] = []
    if (input.reportDocumentId) {
      const doc = await prisma.propertyDocument.findUnique({ where: { id: input.reportDocumentId } })
      if (doc) docUrls.push(doc.url)
    }

    const report = await prisma.propertyReport.create({
      data: {
        propertyId,
        reportPeriodStart: new Date(input.reportPeriodStart!),
        reportPeriodEnd: new Date(input.reportPeriodEnd!),
        description: input.reportDescription,
        documents: docUrls,
        onChainTxHash: result.yieldTxHash,
      },
    })

    const sla = await prisma.propertySLA.findUnique({ where: { propertyId } })
    if (sla) {
      const nextDue = new Date()
      nextDue.setDate(nextDue.getDate() + sla.reportPeriodDays)
      await prisma.propertySLA.update({
        where: { propertyId },
        data: { nextReportDueAt: nextDue },
      })
    }

    result.reportId = report.id
  }

  return result
}

export const createRegisterPropertyTxService = async (
  input: RegisterPropertyTxInput,
  ownerAddress: string,
  propertyId: string,
  chainId: string
) => {
  const contract = await prisma.contract.findFirst({
    where: {
      contractName: 'CH_PT',
      chainId
    },
    include: {
      chain: true
    }
  })

  if (!contract) throw new Error('Contract not found')

  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')

  const tx = await buildRegisterTx(input.metadataURI, ownerAddress as `0x${string}`, contract)

  return tx
}

export const submitRegisterProperty = async (
  input: SubmitRegisterPropertyInput,
  ownerAddress: string,
  propertyId: string,
  chainId: string
) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')

  const txHash = input.txHash

  // Update status to REGISTERED and record txHash (tokenId will be synced by indexer)
  await prisma.property.update({
    where: { id: propertyId },
    data: { status: PropertyStatus.REGISTERED },
  })

  await prisma.blockchainTransaction.create({
    data: { propertyId, chainId, type: TxType.REGISTER_PROPERTY, txHash },
  })

  return { txHash }
}

export const submitDeployGuardTx = async (
  input: SubmitDeployGuardTxInput,
  ownerAddress: string,
  propertyId: string,
  chainId: string
) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')

  const txHash = input.txHash

  await prisma.blockchainTransaction.create({
    data: { propertyId, chainId, type: TxType.DEPLOY_GUARD, txHash },
  })

  return { txHash }
}

export const submitSwapTx = async (
  input: { txHash: string },
  ownerAddress: string,
  propertyId: string,
  chainId: string
) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  // We dont mandate only owner can swap! Wait, anyone who connects wallet can swap.
  // But wait, the transaction table tracks property transactions.
  // Actually, the property.ownerAddress check is for owner actions.
  // Anyone can swap, so we shouldn't throw Forbidden here if it's not the owner.
  // Let me just remove the forbidden check for swap.

  const txHash = input.txHash

  // create the tx but also maybe record user's wallet address if we want?
  // currently blockchain transaction table doesn't have fromAddress. So we just record it.
  await prisma.blockchainTransaction.create({
    data: { propertyId, chainId, type: TxType.SWAP_TOKEN, txHash },
  })

  return { txHash }
}

export const getRecentTransactions = (limit = 15) =>
  prisma.blockchainTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      property: { select: { id: true, name: true, address: true } },
      chain: { select: { chainId: true, name: true, blockExplorerUrl: true } },
    },
  })

export const listTransactions = (
  propertyId: string,
  filters?: { type?: string; status?: string }
) => {
  const where: any = { propertyId }

  if (filters?.type) {
    const types = filters.type.split(',').map((t) => t.trim())
    where.type = { in: types }
  }
  if (filters?.status) {
    const statuses = filters.status.split(',').map((s) => s.trim())
    where.status = { in: statuses }
  }

  return prisma.blockchainTransaction.findMany({
    where,
    include: { chain: { select: { chainId: true, name: true, blockExplorerUrl: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export const syncPropertyTransactions = async (propertyId: string) => {
  const pendingTxs = await prisma.blockchainTransaction.findMany({
    where: { propertyId, status: 'PENDING' },
  })

  const results = await Promise.all(
    pendingTxs.map(async (tx) => {
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: tx.txHash as `0x${string}`,
        })

        if (receipt) {
          const newStatus = receipt.status === 'success' ? 'CONFIRMED' : 'FAILED'

          return prisma.blockchainTransaction.update({
            where: { id: tx.id },
            data: { status: newStatus as any },
          })
        }
      } catch (e) {
        // Receipt not found yet or error
        console.error(`Failed to sync tx ${tx.txHash}:`, e)
      }

      return tx
    })
  )

  return listTransactions(propertyId)
}

export const syncRegisteredProperties = async () => {
  // Find all PENDING_REVIEW properties that might have been registered
  const pendingProps = await prisma.property.findMany({
    where: { status: PropertyStatus.PENDING_REVIEW },
  })

  console.log('Pending Properties:', pendingProps.length)

  if (pendingProps.length === 0) return

  // In production, might want 'after' cursor, for now we poll latest 50
  const indexerData = await getRegisteredProperties(undefined, 50)
  const items = indexerData?.items as any || []

  console.log('Indexer Data:', items.length)

  for (const property of pendingProps) {
    // Attempt to match by transaction hash if recorded, or by owner heuristic
    // For safety, checking if there is a BlockchainTransaction with type REGISTER_PROPERTY
    const tx = await prisma.blockchainTransaction.findFirst({
      where: { propertyId: property.id, type: TxType.REGISTER_PROPERTY }
    })

    if (tx) {
      const match = items.find((i: any) => i.transactionHash.toLowerCase() === tx.txHash.toLowerCase())
      if (match) {
        await prisma.property.update({
          where: { id: property.id },
          data: {
            status: PropertyStatus.REGISTERED,
            tokenId: BigInt(match.tokenId)
          }
        })
      }
    }
  }
}

export const syncDeployGuardTxs = async () => {
  const pendingTxs = await prisma.blockchainTransaction.findMany({
    where: { type: TxType.DEPLOY_GUARD, status: 'CONFIRMED' },
    include: { property: true },
  })

  // We only run this indexer sync for DEPLOY_GUARD if we specifically want to verify the graphQL event.
  // However, the global syncPendingBlockchainTransactions now also handles receipt checking.
  if (pendingTxs.length === 0) return

  for (const tx of pendingTxs) {
    const indexerTx = await getDeployGuardByTxHash(tx.txHash)
    if (indexerTx) {
      await prisma.blockchainTransaction.update({
        where: { id: tx.id },
        data: { status: 'CONFIRMED' },
      })
      await prisma.property.update({
        where: { id: tx.propertyId },
        data: { status: PropertyStatus.TOKEN_LIVE },
      })
    }
  }
}

export const syncPendingBlockchainTransactions = async () => {
  const pendingTxs = await prisma.blockchainTransaction.findMany({
    where: { status: 'PENDING' },
  })

  if (pendingTxs.length === 0) return

  for (const tx of pendingTxs) {
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: tx.txHash as `0x${string}`,
      })

      if (receipt) {
        const newStatus = receipt.status === 'success' ? 'CONFIRMED' : 'FAILED'

        await prisma.blockchainTransaction.update({
          where: { id: tx.id },
          data: { status: newStatus as any },
        })

        // Handle property status side-effects
        if (newStatus === 'FAILED') {
          if (tx.type === TxType.REGISTER_PROPERTY || tx.type === TxType.MINT_PRINCIPLE) {
            // Revert back
            await prisma.property.update({
              where: { id: tx.propertyId },
              data: { status: PropertyStatus.PENDING_REVIEW },
            })
          }
        } else if (newStatus === 'CONFIRMED') {
          // Immediately transition the property to TOKEN_LIVE upon a successful DeployGuard transaction
          if (tx.type === TxType.DEPLOY_GUARD) {
            await prisma.property.update({
              where: { id: tx.propertyId },
              data: { status: PropertyStatus.TOKEN_LIVE },
            })
          }
        }
      }
    } catch (e) {
      // Transaction might still be pending or not found, silently ignore
    }
  }
}

export const syncPropertyTokenId = async () => {
  const registeredProps = await prisma.property.findMany({
    where: { status: { in: [PropertyStatus.REGISTERED, PropertyStatus.DRAFT, PropertyStatus.PENDING_REVIEW] }, tokenId: { equals: null } },
  })

  console.log('Registered Properties:', registeredProps.length)

  for (const property of registeredProps) {

    const position = await getRegistered(property.id.toString())
    console.log('position', position)
    if (position) {
      await prisma.property.update({
        where: { id: property.id },
        data: { tokenId: BigInt(position.tokenId), status: PropertyStatus.REGISTERED }
      })
    }
  }
}

export const syncFractionalizedPositions = async () => {
  const registeredProps = await prisma.property.findMany({
    where: { status: PropertyStatus.REGISTERED, tokenId: { not: null } },
  })

  console.log('Registered Properties:', registeredProps.length)

  for (const property of registeredProps) {
    console.log('Property:', property.id)
    if (!property.tokenId) continue

    const position = await getMintPrincipleByTokenId(property.tokenId.toString())
    console.log('position', position)
    if (position) {
      // Position registered on chain -> update to TOKENIZED
      await prisma.property.update({
        where: { id: property.id },
        data: { status: PropertyStatus.TOKENIZED }
      })
    }
  }
}

export const checkPropertyMaturation = async () => {
  const tokenizedProps = await prisma.property.findMany({
    where: { status: PropertyStatus.TOKENIZED, salePeriodEnd: { not: null } },
  })

  const now = new Date()

  for (const property of tokenizedProps) {
    if (property.salePeriodEnd && property.salePeriodEnd < now) {
      // Sale period ended -> transition to LISTED
      await prisma.property.update({
        where: { id: property.id },
        data: { status: PropertyStatus.LISTED }
      })
    }
  }
}

