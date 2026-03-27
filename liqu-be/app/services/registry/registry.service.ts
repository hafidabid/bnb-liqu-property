import db from '#prisma/prisma'

const RegistryService = {
  /**
     * Get a contract address from the database by name and chainId.
     */
  getContractAddress: async (chainId: string, contractName: string): Promise<`0x${string}` | null> => {
    const contract = await db.contract.findUnique({
      where: {
        chainId_contractName: {
          chainId,
          contractName,
        },
      },
    })

    return (contract?.address as `0x${string}`) || null
  },

  /**
     * Get a system account (address and private key) from the database by name and chainId.
     */
  getSystemAccount: async (chainId: string, name: string) => {
    const account = await db.systemAccount.findUnique({
      where: {
        chainId_name: {
          chainId,
          name,
        },
      },
    })

    return account
  },

  /**
     * Get an RPC URL for a chain.
     */
  getRpcUrl: async (chainId: string): Promise<string | null> => {
    const rpc = await db.rpc.findFirst({
      where: {
        chainId,
        isActive: true,
      },
      orderBy: {
        priority: 'asc',
      },
    })

    return rpc?.url || null
  },
}

export default RegistryService
