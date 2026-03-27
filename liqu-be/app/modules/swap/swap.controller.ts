import { FastifyReply, FastifyRequest } from 'fastify'
import {
  createSwapTx,
  submitSwapTx,
} from '#app/services/contracts/lib/swap/swap'
import RegistryService from '#app/services/registry/registry.service'
import { RouterInput } from '#app/modules/swap/swap.interface'

const SwapController = {
  createSwapTx: async (request: FastifyRequest<{ Params: { chainId: string } }>, reply: FastifyReply) => {
    const { chainId } = request.params
    const routerAddress = await RegistryService.getContractAddress(chainId, 'SWAP_ROUTER_PT')
    if (!routerAddress) return reply.status(404).send({ success: false, error: 'Router not found' })

    const { from, token0, zeroForOne, amountIn, amountOut, deadline } =
      request.body as RouterInput
    const tx = await createSwapTx(
      {
        token0,
        zeroForOne,
        amountIn,
        amountOut,
        deadline,
      },
      from,
      routerAddress
    )
    reply.status(200).send({ success: true, tx })
  },
  submitSwapTx: async (request: FastifyRequest<{ Params: { chainId: string } }>, reply: FastifyReply) => {
    const { tx } = request.body as { tx: `0x${string}` }
    const txHash = await submitSwapTx(tx)
    reply.status(200).send({ success: true, txHash })
  },
}

export default SwapController
