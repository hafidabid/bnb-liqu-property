import axiosInstance from '../axios'
import { cached } from '../cache'

export type ChainData = {
  id: number
  chainId: number
  name: string
  shortName: string | null
  nativeCurrencyName: string
  nativeCurrencySymbol: string
  nativeCurrencyDecimals: number
  blockExplorerName: string | null
  blockExplorerUrl: string | null
  isTestnet: boolean
  isActive: boolean
}

export type ContractData = {
  id: number
  chainId: number
  contractName: string
  address: string
  abi: unknown[] | null
  isActive: boolean
}

// r is the JSON body returned by the axios response interceptor:
// { status, code, message, data: [...] }

// Chains config rarely changes — cache for 5 minutes
export const getChains = (): Promise<ChainData[]> =>
  cached('chains:list', 5 * 60_000, () => axiosInstance.get('/v1/chains').then(r => r.data))

export const getChain = (chainId: number): Promise<ChainData> =>
  cached(`chains:${chainId}`, 5 * 60_000, () => axiosInstance.get(`/v1/chains/${chainId}`).then(r => r.data))

export const getContracts = (chainId: number): Promise<ContractData[]> =>
  axiosInstance.get(`/v1/chains/${chainId}/contracts`).then(r => r.data)

export const getContract = (chainId: number, address: string): Promise<ContractData> =>
  axiosInstance.get(`/v1/chains/${chainId}/contracts/${address}`).then(r => r.data)

/** Build a contractName → address map for a given chain. */
const _contractCache = new Map<number, Promise<Record<string, `0x${string}`>>>()

export const loadContractAddresses = (chainId: number): Promise<Record<string, `0x${string}`>> => {
  if (!_contractCache.has(chainId)) {
    const req = getContracts(chainId).then(contracts =>
      Object.fromEntries(contracts.map(c => [c.contractName, c.address as `0x${string}`]))
    )
    _contractCache.set(chainId, req)
    // Remove from cache on error so a retry is possible
    req.catch(() => _contractCache.delete(chainId))
  }
  return _contractCache.get(chainId)!
}

/** Call this on logout / chain switch to force a fresh fetch next time. */
export const clearContractCache = (chainId?: number) => {
  if (chainId !== undefined) _contractCache.delete(chainId)
  else _contractCache.clear()
}
