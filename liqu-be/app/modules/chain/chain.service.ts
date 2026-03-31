import db from '#prisma/prisma'
import AppException from '#app/exceptions/app_exception'
import ErrorCodes from '#app/exceptions/error_codes'
import { RpcTier } from '@prisma/client'

/**
 * JSON-RPC methods that require a paid/premium RPC node.
 * Everything else is routed to free-tier RPCs.
 */
const PAID_METHODS = new Set([
  'eth_call', // read contract / simulate
  'eth_sendRawTransaction', // write contract / send tx
  'eth_getLogs', // event logs
  'eth_newFilter',
  'eth_getFilterLogs',
  'eth_getFilterChanges',
  'eth_getTransactionReceipt', // tx status
  'eth_getTransactionByHash',
  // 'eth_estimateGas',
  'debug_traceTransaction',
  'trace_transaction',
  'trace_call',
])

function preferredTier(method: string): RpcTier {
  return PAID_METHODS.has(method) ? RpcTier.PAID : RpcTier.FREE
}

const ChainService = {
  listChains: async () => {
    return db.chain.findMany({
      where: { isActive: true },
      orderBy: { chainId: 'asc' },
    })
  },

  getChain: async (chainId: string) => {
    const chain = await db.chain.findUnique({
      where: { chainId },
    })

    if (!chain) {
      throw new AppException(404, ErrorCodes.BAD_REQUEST, `Chain ${chainId} not found`)
    }

    if (!chain.isActive) {
      throw new AppException(400, ErrorCodes.BAD_REQUEST, `Chain ${chainId} is not active`)
    }

    return chain
  },

  proxyRpc: async (chainId: string, body: unknown) => {
    const rpcBody = body as { method?: string }
    const method = rpcBody?.method ?? ''
    const preferred = preferredTier(method)
    const fallback = preferred === RpcTier.PAID ? RpcTier.FREE : RpcTier.PAID

    // Fetch all active RPCs ordered by tier preference then priority
    const allRpcs = await db.rpc.findMany({
      where: { chainId, isActive: true },
      orderBy: { priority: 'asc' },
    })

    if (allRpcs.length === 0) {
      throw new AppException(404, ErrorCodes.BAD_REQUEST, `No active RPC found for chainId ${chainId}`)
    }

    // Try preferred tier first, then fallback tier
    const ordered = [
      ...allRpcs.filter(r => r.tier === preferred),
      ...allRpcs.filter(r => r.tier === fallback),
    ]

    const errors: string[] = []

    for (const rpc of ordered) {
      try {
        const response = await fetch(rpc.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          errors.push(`rpc#${rpc.id} (${rpc.tier}) HTTP ${response.status}`)
          continue
        }

        const json: { error?: { code: number; message: string } } = await response.json()
        if (json?.error) {
          errors.push(`rpc#${rpc.id} (${rpc.tier}) JSON-RPC error ${json.error.code}: ${json.error.message}`)
          continue
        }

        return json
      } catch (err) {
        errors.push(`rpc#${rpc.id} (${rpc.tier}) ${(err as Error).message}`)
      }
    }

    console.error(`[RPC] All RPCs failed for chainId=${chainId} method=${method}:`, errors)
    throw new AppException(502, ErrorCodes.SYSTEM_ERROR, `All RPC upstreams failed for chainId ${chainId}`)
  },

  listContracts: async (chainId: string) => {
    await ChainService.getChain(chainId)

    return db.contract.findMany({
      where: { chainId, isActive: true },
      orderBy: { contractName: 'asc' },
    })
  },

  getContract: async (chainId: string, address: string) => {
    await ChainService.getChain(chainId)

    const contract = await db.contract.findFirst({
      where: {
        chainId,
        address: { equals: address, mode: 'insensitive' },
      },
    })

    if (!contract) {
      throw new AppException(404, ErrorCodes.BAD_REQUEST, `Contract ${address} not found on chain ${chainId}`)
    }

    return contract
  },
}

export default ChainService
