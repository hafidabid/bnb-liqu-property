const AdminSchema = {
  mintAsset: {
    schema: {
      description: 'Mint an asset to an address',
      tags: ['admin'],
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
          to: {
            type: 'string',
            description: 'The address to mint the asset to',
          },
        },
        required: ['to'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tx: { type: 'string' },
          },
        },
      },
    },
  },
}

export default AdminSchema
