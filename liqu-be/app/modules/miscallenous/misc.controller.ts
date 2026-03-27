import { FastifyReply, FastifyRequest } from 'fastify'
import { approveMintPrinciple } from '#app/services/contracts/lib/mint/mintPrinciple'
import { dealUSDC } from '#app/services/contracts/lib/deal/deal'
import RegistryService from '#app/services/registry/registry.service'

const MiscController = {
  approveMintPrinciple: async (
    request: FastifyRequest<{ Params: { chainId: string } }>,
    reply: FastifyReply
  ) => {
    const { chainId } = request.params
    const ptAddress = await RegistryService.getContractAddress(chainId, 'CH_PT')
    const assetAddress = await RegistryService.getContractAddress(chainId, 'CH_ASSET')
    if (!ptAddress || !assetAddress) return reply.status(404).send({ success: false, error: 'Contract not found' })

    const { tokenId } = request.body as {
      tokenId: number
    }
    const tx = await approveMintPrinciple(tokenId, ptAddress, assetAddress)
    reply.status(200).send({ success: true, tx })
  },
  dealUSDC: async (request: FastifyRequest<{ Params: { chainId: string } }>, reply: FastifyReply) => {
    const { chainId } = request.params
    const usdcAddress = await RegistryService.getContractAddress(chainId, 'CH_USDC')
    if (!usdcAddress) return reply.status(404).send({ success: false, error: 'USDC contract not found' })

    const { amount, to } = request.body as {
      amount: number
      to: `0x${string}`
    }
    const tx = await dealUSDC(BigInt(amount), to, usdcAddress)
    reply.status(200).send({ success: true, tx })
  },
}

export default MiscController
