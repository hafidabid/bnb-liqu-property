const IndexerSchema = {
  propertiesRegistered: {
    schema: {
      description: 'Get all on-chain registered properties from indexer',
      tags: ['indexer'],
      querystring: {
        type: 'object',
        properties: {
          after: { type: 'string' },
          limit: { type: 'number', default: 20 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            items: { type: 'array', items: { type: 'object', additionalProperties: true } },
            pageInfo: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },
  propertyRegisteredById: {
    schema: {
      description: 'Get on-chain registration record for a single property token',
      tags: ['indexer'],
      params: {
        type: 'object',
        required: ['tokenId'],
        properties: {
          tokenId: { type: 'string' },
        },
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
  yieldHistory: {
    schema: {
      description: 'Get yield distribution history for a property from indexer',
      tags: ['indexer'],
      params: {
        type: 'object',
        required: ['tokenId'],
        properties: {
          tokenId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            items: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  },
  reports: {
    schema: {
      description: 'Get on-chain report acknowledgements for a property from indexer',
      tags: ['indexer'],
      params: {
        type: 'object',
        required: ['tokenId'],
        properties: {
          tokenId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            items: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  },
  platformFees: {
    schema: {
      description: 'Get platform fee mint record for a property from indexer',
      tags: ['indexer'],
      params: {
        type: 'object',
        required: ['tokenId'],
        properties: {
          tokenId: { type: 'string' },
        },
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
}

export default IndexerSchema
