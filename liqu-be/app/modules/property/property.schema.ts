const txResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        from: { type: 'string' },
        data: { type: 'string' },
        nonce: { type: 'number' },
        gas: { type: 'string' },
        maxFeePerGas: { type: 'string' },
        maxPriorityFeePerGas: { type: 'string' },
        type: { type: 'string' },
      },
    },
  },
}

const PropertySchema = {
  createProperty: {
    schema: {
      description: 'Create a property draft',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'description', 'propertyType', 'address', 'latitude', 'longitude'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          propertyType: { type: 'string' },
          address: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          totalAreaSqm: { type: 'number' },
          legalEntityName: { type: 'string' },
          legalRegistrationId: { type: 'string' },
          legalNotaryName: { type: 'string' },
          prospectusMarkdown: { type: 'string' },
          salePeriodStart: { type: 'string' },
          salePeriodEnd: { type: 'string' },
          targetFundUSD: { type: 'number' },
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
  listProperties: {
    schema: {
      description: 'List tokenized/listed properties',
      tags: ['property'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
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
  getProperty: {
    schema: {
      description: 'Get property by ID',
      tags: ['property'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
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
  updateProperty: {
    schema: {
      description: 'Update a DRAFT property',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          propertyType: { type: 'string' },
          address: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          totalAreaSqm: { type: 'number' },
          legalEntityName: { type: 'string' },
          legalRegistrationId: { type: 'string' },
          legalNotaryName: { type: 'string' },
          prospectusMarkdown: { type: 'string' },
          salePeriodStart: { type: 'string' },
          salePeriodEnd: { type: 'string' },
          targetFundUSD: { type: 'number' },
          metadataURI: { type: 'string' },
          thumbnailDocumentId: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['DRAFT', 'PENDING_REVIEW'] },
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
  getMyProperties: {
    schema: {
      description: 'List properties owned by the authenticated user',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
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
  uploadDocument: {
    schema: {
      description: 'Upload a document for a property (multipart/form-data)',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
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
  listDocuments: {
    schema: {
      description: 'List documents for a property',
      tags: ['property'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  },
  deleteDocument: {
    schema: {
      description: 'Delete a document (DRAFT property only)',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'docId'],
        properties: {
          id: { type: 'string' },
          docId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  },
  setSLA: {
    schema: {
      description: 'Set or update SLA parameters',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['yieldPeriodDays', 'reportPeriodDays', 'holderYieldBPS', 'baselineYieldBPS'],
        properties: {
          yieldPeriodDays: { type: 'number' },
          reportPeriodDays: { type: 'number' },
          holderYieldBPS: { type: 'number' },
          baselineYieldBPS: { type: 'number' },
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
  getSLA: {
    schema: {
      description: 'Get SLA config for a property',
      tags: ['property'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
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
  submitReport: {
    schema: {
      description: 'Submit a periodic report (multipart/form-data)',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
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
  listReports: {
    schema: {
      description: 'List reports for a property',
      tags: ['property'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  },
  createYieldTx: {
    schema: {
      description: 'Build unsigned distributeYield() transaction',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'chainId'],
        properties: {
          id: { type: 'string' },
          chainId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'string', description: 'Amount in raw token units (USDC 6 decimals)' },
        },
      },
      response: {
        200: txResponseSchema,
      },
    },
  },
  submitYieldTx: {
    schema: {
      description: 'Record a yield distribution tx (already broadcast by the wallet)',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'chainId'],
        properties: {
          id: { type: 'string' },
          chainId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['txHash', 'totalAmount', 'holderAmount', 'baselineAmount', 'platformFee'],
        properties: {
          txHash: { type: 'string' },
          totalAmount: { type: 'string' },
          holderAmount: { type: 'string' },
          baselineAmount: { type: 'string' },
          platformFee: { type: 'string' },
        },
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
  getYieldHistory: {
    schema: {
      description: 'Get yield distribution history for a property',
      tags: ['property'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  },
  createRegisterPropertyTx: {
    schema: {
      description: 'Build unsigned registerProperty() transaction',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'chainId'],
        properties: {
          id: { type: 'string' },
          chainId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['metadataURI'],
        properties: {
          metadataURI: { type: 'string' },
        },
      },
      response: {
        200: txResponseSchema,
      },
    },
  },
  submitRegisterProperty: {
    schema: {
      description: 'Record a registerProperty tx (already broadcast by the wallet) and update DB',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'chainId'],
        properties: {
          id: { type: 'string' },
          chainId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['txHash'],
        properties: {
          txHash: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            txHash: { type: 'string' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },
  listTransactions: {
    schema: {
      description: 'List blockchain transactions for a property',
      tags: ['property'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Comma separated TxType' },
          status: { type: 'string', description: 'Comma separated TxStatus' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  },
  syncTransactions: {
    schema: {
      description: 'Synchronize pending blockchain transactions with the chain',
      tags: ['property'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  },
  submitYieldAndReport: {
    schema: {
      description: 'Submit yield distribution and/or a periodic report in a single call',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'chainId'],
        properties: {
          id: { type: 'string' },
          chainId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          yieldTxHash: { type: 'string', description: 'Already-broadcast yield distribution tx hash' },
          totalAmount: { type: 'string' },
          holderAmount: { type: 'string' },
          baselineAmount: { type: 'string' },
          platformFee: { type: 'string' },
          reportPeriodStart: { type: 'string', description: 'ISO date string' },
          reportPeriodEnd: { type: 'string', description: 'ISO date string' },
          reportDescription: { type: 'string' },
          reportDocumentId: { type: 'string', description: 'Pre-uploaded PropertyDocument id' },
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
  submitDeployGuardTx: {
    schema: {
      description: 'Record a deployGuard tx (already broadcast by the wallet) and update DB',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'chainId'],
        properties: {
          id: { type: 'string' },
          chainId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['txHash'],
        properties: {
          txHash: { type: 'string' },
        },
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
  submitSwapTx: {
    schema: {
      description: 'Record a Swap tx (already broadcast by the wallet) and update DB',
      tags: ['property'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'chainId'],
        properties: {
          id: { type: 'string' },
          chainId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['txHash'],
        properties: {
          txHash: { type: 'string' },
        },
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
  recentTransactions: {
    schema: {
      description: 'Get the most recent blockchain transactions across all properties',
      tags: ['property'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 15 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  },
}

export default PropertySchema
