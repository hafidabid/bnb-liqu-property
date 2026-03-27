// ─── Response schemas ────────────────────────────────────────────────────────

const ChainObject = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    chainId: { type: 'number' },
    name: { type: 'string' },
    shortName: { type: 'string', nullable: true },
    nativeCurrencyName: { type: 'string' },
    nativeCurrencySymbol: { type: 'string' },
    nativeCurrencyDecimals: { type: 'number' },
    blockExplorerName: { type: 'string', nullable: true },
    blockExplorerUrl: { type: 'string', nullable: true },
    isTestnet: { type: 'boolean' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
}

const ContractObject = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    chainId: { type: 'number' },
    contractName: { type: 'string' },
    address: { type: 'string' },
    abi: { nullable: true },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
}

export const ListChainsResponse = {
  200: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      code: { type: 'string', nullable: true },
      message: { type: 'string', nullable: true },
      data: {
        type: 'array',
        items: ChainObject,
      },
    },
  },
}

export const GetChainResponse = {
  200: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      code: { type: 'string', nullable: true },
      message: { type: 'string', nullable: true },
      data: ChainObject,
    },
  },
}

export const ListContractsResponse = {
  200: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      code: { type: 'string', nullable: true },
      message: { type: 'string', nullable: true },
      data: {
        type: 'array',
        items: ContractObject,
      },
    },
  },
}

export const GetContractResponse = {
  200: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      code: { type: 'string', nullable: true },
      message: { type: 'string', nullable: true },
      data: ContractObject,
    },
  },
}

export const RpcProxyBody = {
  type: 'object',
  required: ['jsonrpc', 'method', 'id'],
  properties: {
    jsonrpc: { type: 'string', description: 'JSON-RPC version (e.g. "2.0")' },
    method: { type: 'string', description: 'JSON-RPC method name' },
    params: { description: 'Method parameters', type: 'array' },
    id: { description: 'Request ID' },
  },
}
