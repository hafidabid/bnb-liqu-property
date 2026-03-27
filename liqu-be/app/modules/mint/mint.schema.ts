const MintSchema = {
  approveMintPrinciple: {
    schema: {
      description: 'Approve PrincipleAsset spending for PrincipleToken',
      tags: ['mint'],
      params: {
        type: 'object',
        properties: {
          chainId: { type: 'string' },
        },
        required: ['chainId'],
      },
      body: {
        type: 'object',
        properties: {
          tokenId: { type: 'number', description: 'The token id to approve' },
          from: { type: 'string', description: 'The address of the sender' },
        },
        required: ['tokenId', 'from'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },
  mintPrinciple: {
    schema: {
      description: 'Mint a principle',
      tags: ['mint'],
      params: {
        type: 'object',
        properties: {
          chainId: { type: 'string' },
        },
        required: ['chainId'],
      },
      body: {
        type: 'object',
        properties: {
          propertyId: {
            type: 'string',
            description: 'The property ID to fetch SLA details from',
          },
          from: {
            type: 'string',
            description: 'The address to mint the principle from',
          },
          totalSupply: {
            type: 'number',
            description: 'The total supply of the principle',
          },
          presaleAmount: {
            type: 'number',
            description: 'The amount of the principle to mint',
          },
          deadline: {
            type: 'number',
            description: 'The deadline of the principle',
          },
          tokenId: {
            type: 'number',
            description: 'The token id of the principle',
          },
          presalePrice: {
            type: 'number',
            description: 'The price of the principle',
          },
        },
        required: [
          'propertyId',
          'from',
          'totalSupply',
          'presaleAmount',
          'deadline',
          'tokenId',
          'presalePrice',
        ],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },
  submitMintPrinciple: {
    schema: {
      description: 'Submit a mint principle transaction',
      tags: ['mint'],
      params: {
        type: 'object',
        properties: {
          chainId: { type: 'string' },
        },
        required: ['chainId'],
      },
      body: {
        type: 'object',
        properties: {
          propertyId: { type: 'string' },
          txHash: { type: 'string' },
        },
        required: ['propertyId', 'txHash'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            txHash: { type: 'string' },
          },
        },
      },
    },
  },
}

export default MintSchema
