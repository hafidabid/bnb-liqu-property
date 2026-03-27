import { FastifyReply, FastifyRequest } from 'fastify'
import mintAsset from '#app/services/contracts/lib/mint/mintAsset'
import RegistryService from '#app/services/registry/registry.service'

const AdminController = {
  mintAsset: async (request: FastifyRequest<{ Params: { chainId: string } }>, reply: FastifyReply) => {
    const { chainId } = request.params
    const ptAddress = await RegistryService.getContractAddress(chainId, 'CH_PT')
    if (!ptAddress) return reply.status(404).send({ success: false, error: 'PT contract not found' })

    const { to } = request.body as { to: `0x${string}` }
    const tx = await mintAsset(to, ptAddress)
    reply.status(200).send({ success: true, tx })
  },
}

export default AdminController
