import { FastifyReply, FastifyRequest } from 'fastify'
import {
  createPresaleTx,
  submitPresaleTx,
  approveUSDCPresale,
} from '#app/services/contracts/lib/presale/presale'
import RegistryService from '#app/services/registry/registry.service'
import { PresaleInput } from '#app/modules/presale/presale.interface'

const PresaleController = {
  createPresaleTx: async (
    request: FastifyRequest<{ Params: { chainId: string }; Body: PresaleInput }>,
    reply: FastifyReply
  ) => {
    const { chainId } = request.params
    const ptAddress = await RegistryService.getContractAddress(chainId, 'CH_PT')
    if (!ptAddress) return reply.status(404).send({ success: false, error: 'PT contract not found' })

    const { from, tokenId, amount } = request.body
    const tx = await createPresaleTx({ tokenId, amount }, from, ptAddress)
    reply.status(200).send({ success: true, data: tx })
  },
  submitPresaleTx: async (request: FastifyRequest<{ Params: { chainId: string } }>, reply: FastifyReply) => {
    const { tx } = request.body as { tx: `0x${string}` }
    const txHash = await submitPresaleTx(tx)
    reply.status(200).send({ success: true, txHash })
  },
  approveUSDCPresale: async (request: FastifyRequest<{ Params: { chainId: string } }>, reply: FastifyReply) => {
    const { chainId } = request.params
    const assetAddress = await RegistryService.getContractAddress(chainId, 'CH_ASSET')
    const usdcAddress = await RegistryService.getContractAddress(chainId, 'CH_USDC')
    if (!assetAddress || !usdcAddress) return reply.status(404).send({ success: false, error: 'Contract not found' })

    const { amount } = request.body as { amount: number }
    const tx = await approveUSDCPresale(amount, assetAddress, usdcAddress)
    reply.status(200).send({ success: true, tx })
  },
}

export default PresaleController
