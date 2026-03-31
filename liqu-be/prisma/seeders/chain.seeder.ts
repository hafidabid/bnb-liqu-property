import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedChains() {
  console.log('Seeding chains, rpcs, and contracts...')

  // ─── Binance Smart Chain Testnet ─────────────────────────────────────────
  const bscTestnet = await prisma.chain.upsert({
    where: { chainId: '97' },
    update: {
      blockExplorerName: 'BscScan',
      blockExplorerUrl: 'https://testnet.bscscan.com',
    },
    create: {
      chainId: '97',
      name: 'Binance Smart Chain Testnet',
      shortName: 'bsc-testnet',
      nativeCurrencyName: 'Test BNB',
      nativeCurrencySymbol: 'tBNB',
      nativeCurrencyDecimals: 18,
      blockExplorerName: 'BscScan',
      blockExplorerUrl: 'https://testnet.bscscan.com',
      isTestnet: true,
      isActive: true,
    },
  })

  console.log(`Chain upserted: ${bscTestnet.name} (chainId=${bscTestnet.chainId})`)

  // ─── RPCs ────────────────────────────────────────────────────────────────
  // Deactivate deprecated binance.org endpoints (migrated to bnbchain.org)
  const deprecatedRpcUrls = [
    'https://data-seed-prebsc-1-s1.binance.org:8545',
    'https://data-seed-prebsc-2-s1.binance.org:8545',
  ]
  await prisma.rpc.updateMany({
    where: { url: { in: deprecatedRpcUrls }, chainId: '97' },
    data: { isActive: false },
  })

  // Priority 0 = highest priority. PAID tier: for contract calls, event logs,
  // tx simulation, tx status. FREE tier: for block data, gas price, balances.
  const paidRpcUrl = [
    'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    'https://data-seed-prebsc-1-s2.bnbchain.org:8545',
  ]
  for (const url of paidRpcUrl) {
    const isExist = await prisma.rpc.findFirst({
      where: { url, chainId: '97' },
    })
    if (isExist) {
      // udpate
      await prisma.rpc.update({
        where: { id: isExist.id },
        data: {
          url,
          chainId: '97',
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
        chainId: '97',
        isActive: true,
        priority: 0,
        tier: 'PAID',
      },
    })
  }

  // Public free RPC — used for cheap reads (block number, gas price, balances).
  // Falls back to paid if no free RPC is available, and vice versa.
  const freeRpcUrls = [
    'https://rpc.sentio.xyz/bsc-testnet',
    'https://bnb-testnet.api.onfinality.io/public',
    'https://api.zan.top/bsc-testnet',
    'https://bsc-testnet.publicnode.com',
    'https://bsc-testnet.drpc.org',
    'https://data-seed-prebsc-2-s1.bnbchain.org:8545',
    'https://data-seed-prebsc-2-s2.bnbchain.org:8545',
    'https://data-seed-prebsc-1-s3.bnbchain.org:8545',
    'https://data-seed-prebsc-1-s2.bnbchain.org:8545',
    'https://data-seed-prebsc-2-s3.bnbchain.org:8545',
    'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    'https://bsc-testnet.therpc.io',
    'https://endpoints.omniatech.io/v1/bsc/testnet/public',
    'https://bsc-testnet.4everland.org/v1/37fa9972c1b1cd5fab542c7bdd4cde2f',
    'https://public.stackup.sh/api/v1/node/bsc-testnet',
    'https://bsc-testnet.public.blastapi.io',
    'https://bsctestapi.terminet.io/rpc'
  ]

  for (const url of freeRpcUrls) {
    const isExist = await prisma.rpc.findFirst({
      where: { url, chainId: '97' },
    })
    if (isExist) {
      await prisma.rpc.update({
        where: { id: isExist.id },
        data: {
          url,
          chainId: '97',
          isActive: true,
          priority: 0,
          tier: 'FREE',
        },
      })
      continue
    }
    await prisma.rpc.create({
      data: {
        url,
        chainId: '97',
        isActive: true,
        priority: 0,
        tier: 'FREE',
      },
    })
  }
  console.log('RPCs upserted for BSC Testnet (PAID: public endpoints, FREE: public)')

  // ─── Contracts ───────────────────────────────────────────────────────────
  const contracts = [
    { contractName: 'CH_USDC', address: '0x9a7CCBA56D47709c1F00292eDA37362925567703' },
    { contractName: 'CH_GUARD_FACTORY', address: '0xdD4bB6F360d8720c0DBCdA521DC6Fc50D4DBb2b7' },
    { contractName: 'CH_FACTORY', address: '0xD06c4783d2568FE459240e31da00Aaa0f5DD58D5' },
    { contractName: 'CH_ASSET', address: '0xD45aaD603D096Eea0CFFD5d5329efF5F4cAdf7Ec' },
    { contractName: 'CH_PT', address: '0x157ad820FD53b33cD3452C4f0ff64bb63a128636' },
    { contractName: 'SWAP_ROUTER_PT', address: '0xfb13a1da18a3D88b7e2a626eb9Eb6E692bDaa7aA' },
    { contractName: 'PLATFORM_TREASURY', address: '0x57a89764C6959Fb665E409eE661290B6B32e6c66' },
  ]

  for (const { contractName, address } of contracts) {
    await prisma.contract.upsert({
      where: { chainId_contractName: { chainId: '97', contractName } },
      update: { address, isActive: true },
      create: {
        chainId: '97',
        contractName,
        address,
        isActive: true,
      },
    })
    console.log(`Contract upserted: ${contractName} = ${address}`)
  }

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
