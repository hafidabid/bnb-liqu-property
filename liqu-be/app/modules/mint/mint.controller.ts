import { FastifyReply, FastifyRequest } from 'fastify'
import {
  createMintPrincipleTx,
  createApproveMintPrincipleTx,
} from '#app/services/contracts/lib/mint/mintPrinciple'
import { MintPrincipleInput, ApproveMintPrincipleInput, SubmitMintPrincipleInput } from '#app/modules/mint/mint.interface'
import prisma from '#prisma/prisma'
import { TxType } from '@prisma/client'

const MintController = {
  approveMintPrinciple: async (request: FastifyRequest<{ Params: { chainId: string }; Body: ApproveMintPrincipleInput }>, reply: FastifyReply) => {
    try {
      const { chainId } = request.params
      const { tokenId, from } = request.body

      const principleAssetContract = await prisma.contract.findFirst({
        where: { contractName: 'CH_ASSET', chainId },
        include: { chain: true },
      })
      const principleTokenContract = await prisma.contract.findFirst({
        where: { contractName: 'CH_PT', chainId },
        include: { chain: true },
      })

      if (!principleAssetContract || !principleTokenContract) {
        return reply.status(404).send({ success: false, error: 'Contracts not found' })
      }

      const tx = await createApproveMintPrincipleTx(
        tokenId,
        from,
        principleAssetContract,
        principleTokenContract
      )

      const serializedTx = JSON.parse(
        JSON.stringify(tx, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
      )
      reply.status(200).send({ success: true, data: serializedTx })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },
  mintPrinciple: async (request: FastifyRequest<{ Params: { chainId: string }; Body: MintPrincipleInput }>, reply: FastifyReply) => {
    try {
      const { chainId } = request.params
      const {
        propertyId,
        from,
        totalSupply,
        presaleAmount,
        deadline,
        tokenId,
        presalePrice,
      } = request.body

      const contract = await prisma.contract.findFirst({
        where: { contractName: 'CH_PT', chainId },
        include: { chain: true },
      })
      if (!contract) return reply.status(404).send({ success: false, error: 'PT contract not found' })

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { sla: true, subscription: true },
      })
      if (!property) return reply.status(404).send({ success: false, error: 'Property not found' })
      if (!property.sla) return reply.status(400).send({ success: false, error: 'Property SLA not configured' })
      if (!property.subscription) return reply.status(400).send({ success: false, error: 'Property Subscription not configured' })

      const tx = await createMintPrincipleTx(
        request.body,
        property.sla,
        property.subscription,
        from,
        contract
      )

      const serializedTx = JSON.parse(
        JSON.stringify(tx, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
      )
      reply.status(200).send({ success: true, data: serializedTx })
    } catch (error) {
      console.error(error)
      reply.status(500).send({ success: false, error: error.message })
    }
  },
  submitMintPrinciple: async (request: FastifyRequest<{ Params: { chainId: string }; Body: SubmitMintPrincipleInput }>, reply: FastifyReply) => {
    try {
      const { chainId } = request.params
      const { propertyId, txHash } = request.body

      const property = await prisma.property.findUnique({ where: { id: propertyId } })
      if (!property) return reply.status(404).send({ success: false, error: 'Property not found' })

      await prisma.blockchainTransaction.create({
        data: {
          propertyId,
          chainId,
          type: TxType.MINT_PRINCIPLE as any,
          txHash,
        },
      })

      // Optional: update property status if needed, though indexer might do it
      // await prisma.property.update({ where: { id: propertyId }, data: { status: 'TOKENIZED' } })

      reply.status(200).send({ success: true, txHash })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },
}

export default MintController
