import { FastifyReply, FastifyRequest } from 'fastify'
import {
  createDeployGuardTx,
  submitDeployGuardTx,
} from '#app/services/contracts/lib/deployGuard/DeployGuard'
import RegistryService from '#app/services/registry/registry.service'
import { DeployGuardInput } from '#app/modules/factory/factory.interface'

const FactoryController = {
  createDeployGuardTx: async (request: FastifyRequest<{ Params: { chainId: string } }>, reply: FastifyReply) => {
    const { chainId } = request.params
    const ptAddress = await RegistryService.getContractAddress(chainId, 'CH_PT')
    if (!ptAddress) return reply.status(404).send({ success: false, error: 'PT contract not found' })

    const { from, name, symbol, tokenId, price, floorPrice } =
      request.body as DeployGuardInput
    const tx = await createDeployGuardTx(
      { name, symbol, tokenId, price, floorPrice },
      from,
      ptAddress
    )
    reply.status(200).send({ success: true, tx })
  },
  submitDeployGuardTx: async (request: FastifyRequest<{ Params: { chainId: string } }>, reply: FastifyReply) => {
    const { tx } = request.body as { tx: `0x${string}` }
    const txHash = await submitDeployGuardTx(tx)
    reply.status(200).send({ success: true, txHash })
  },
}

export default FactoryController
