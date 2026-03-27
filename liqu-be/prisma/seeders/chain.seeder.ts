import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedChains() {
  console.log('Seeding chains, rpcs, and contracts...')

  // ─── Base Sepolia ────────────────────────────────────────────────────────
  const baseSepolia = await prisma.chain.upsert({
    where: { chainId: '84532' },
    update: {
      blockExplorerName: 'Blockscout',
      blockExplorerUrl: 'https://base-sepolia.blockscout.com',
    },
    create: {
      chainId: '84532',
      name: 'Base Sepolia',
      shortName: 'base-sepolia',
      nativeCurrencyName: 'Ether',
      nativeCurrencySymbol: 'ETH',
      nativeCurrencyDecimals: 18,
      blockExplorerName: 'Blockscout',
      blockExplorerUrl: 'https://base-sepolia.blockscout.com',
      isTestnet: true,
      isActive: true,
    },
  })

  console.log(`Chain upserted: ${baseSepolia.name} (chainId=${baseSepolia.chainId})`)

  // ─── RPCs ────────────────────────────────────────────────────────────────
  // Priority 0 = highest priority. PAID tier: for contract calls, event logs,
  // tx simulation, tx status. FREE tier: for block data, gas price, balances.
  const paidRpcUrl = [
    'https://base-sepolia.g.alchemy.com/v2/mBBP3AE9uLK2Tbxwsp1SeD8PQ7tpwwNt',
    'https://base-sepolia.infura.io/v3/1f097f2dcd3b4e25b67188d9e65b084c'
  ]
  for (const url of paidRpcUrl) {
    const isExist = await prisma.rpc.findFirst({
      where: { url, chainId: '84532' },
    })
    if (isExist) {
      // udpate
      await prisma.rpc.update({
        where: { id: isExist.id },
        data: {
          url,
          chainId: '84532',
          isActive: true,
          priority: 0,
          tier: 'PAID',
        },
      })
      continue
    }
    await prisma.rpc.create({
      data: {
        url,
        chainId: '84532',
        isActive: true,
        priority: 0,
        tier: 'PAID',
      },
    })
  }

  // Public free RPC — used for cheap reads (block number, gas price, balances).
  // Falls back to paid if no free RPC is available, and vice versa.
  const freeRpcUrl = 'https://sepolia.base.org'
  await prisma.rpc.upsert({
    where: { id: 2 },
    update: { url: freeRpcUrl, tier: 'FREE' },
    create: {
      url: freeRpcUrl,
      chainId: '84532',
      isActive: true,
      priority: 0,
      tier: 'FREE',
    },
  })
  console.log('RPCs upserted for Base Sepolia (PAID: Infura, FREE: public)')

  // ─── Contracts ───────────────────────────────────────────────────────────
  // const contracts = [
  //   { contractName: 'CH_USDC', address: '0x3905E5dd9ee76d863469994DD28Ae619178E2082' },
  //   { contractName: 'CH_GUARD_FACTORY', address: '0x671b2AF4a57c27c63dD5b68c319e3Af460d8837C' },
  //   { contractName: 'CH_FACTORY', address: '0x11E3600Ea7621dC7133E131389253fF9a848AAA9' },
  //   { contractName: 'CH_ASSET', address: '0xa77F3De3Ffa5764Fd4A9f09f854b9410fBaa9872' },
  //   { contractName: 'CH_PT', address: '0x11c434b5819e5732b456B7A83baddcaC6B568fb9' },
  //   { contractName: 'PROXY_ADMIN_PT', address: '0x2D6DEed7154D1C6C715bF51E05f501689083B840' },
  //   { contractName: 'SWAP_ROUTER_PT', address: '0x670543E131253eE598A41CAad956eb280b504338' },
  //   { contractName: 'YIELD_TOKEN_EXAMPLE', address: '0x75a7D033916cf519fE57528B63687D762dCe0676' },
  // ]

  // for (const { contractName, address } of contracts) {
  //   await prisma.contract.upsert({
  //     where: { chainId_contractName: { chainId: '84532', contractName } },
  //     update: { address, isActive: true },
  //     create: {
  //       chainId: '84532',
  //       contractName,
  //       address,
  //       isActive: true,
  //     },
  //   })
  //   console.log(`Contract upserted: ${contractName} = ${address}`)
  // }

  // // ─── System Accounts ──────────────────────────────────────────────────────
  // const systemAccounts = [
  //   {
  //     name: 'CHAINLINK_DEPLOYER',
  //     address: '0xcdd129b84d3736B43cb86ab551dC5466123EF084',
  //     privateKey: '0x8ca6621bec685facc70df2f10cfbae370d8bc72ea51dfc852f523c2c1589bf93',
  //   },
  //   {
  //     name: 'JAMES',
  //     address: '0x694a9e4538296A8cD6192C09f1D3cE24133D827F',
  //     privateKey: '0xc09e125e0f96f901296bc350bb0c06d75356a788711a97bebc1f0fc41024c71e',
  //   },
  //   {
  //     name: 'ALICE',
  //     address: '0x2cC6347138c8Bf97906AAD32c932Bc4c571763c9',
  //     privateKey: '0x578385f455796e4fdaa2bba133a69d9c9a6e45209921ed5aeb54fd553217cd1e',
  //   },
  // ]

  // for (const acc of systemAccounts) {
  //   await prisma.systemAccount.upsert({
  //     where: { chainId_name: { chainId: '84532', name: acc.name } },
  //     update: { address: acc.address, privateKey: acc.privateKey },
  //     create: {
  //       chainId: '84532',
  //       name: acc.name,
  //       address: acc.address,
  //       privateKey: acc.privateKey,
  //     },
  //   })
  //   console.log(`System account upserted: ${acc.name} = ${acc.address}`)
  // }

  console.log('Chain seeding done.')
}
