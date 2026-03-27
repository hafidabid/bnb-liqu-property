import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedHbar() {
    console.log('Seeding Hedera Testnet chains, rpcs, and contracts...')

    // ─── Hedera Testnet ──────────────────────────────────────────────────────
    const hederaTestnet = await prisma.chain.upsert({
        where: { chainId: '296' },
        update: {
            blockExplorerName: 'Hashscan',
            blockExplorerUrl: 'https://hashscan.io/testnet',
        },
        create: {
            chainId: '296',
            name: 'Hedera Testnet',
            shortName: 'hedera-testnet',
            nativeCurrencyName: 'HBAR',
            nativeCurrencySymbol: 'HBAR',
            nativeCurrencyDecimals: 18,
            blockExplorerName: 'Hashscan',
            blockExplorerUrl: 'https://hashscan.io/testnet',
            isTestnet: true,
            isActive: true,
        },
    })

    console.log(`Chain upserted: ${hederaTestnet.name} (chainId=${hederaTestnet.chainId})`)

    // ─── RPCs ────────────────────────────────────────────────────────────────
    const rpcUrl = 'https://testnet.hashio.io/api'

    const isExist = await prisma.rpc.findFirst({
        where: { url: rpcUrl, chainId: '296' },
    })

    if (isExist) {
        await prisma.rpc.update({
            where: { id: isExist.id },
            data: {
                url: rpcUrl,
                chainId: '296',
                isActive: true,
                priority: 0,
                tier: 'FREE',
            },
        })
    } else {
        await prisma.rpc.create({
            data: {
                url: rpcUrl,
                chainId: '296',
                isActive: true,
                priority: 0,
                tier: 'FREE',
            },
        })
    }

    console.log('RPCs upserted for Hedera Testnet')

    // ─── Contracts ───────────────────────────────────────────────────────────
    const contracts = [
        { contractName: 'CH_USDC', address: '0x3bA26c3f659ed1AC6E550270D9F75D50A2734d39' },
        { contractName: 'CH_GUARD_FACTORY', address: '0x64CcE02142f19Ae4aB7830725Ed06b965C385C30' },
        { contractName: 'CH_FACTORY', address: '0x1f029Df1B9e61053073234c1040c6CB6442A191d' },
        { contractName: 'CH_ASSET', address: '0x1D764E741ceFB8C18044f48F0B7926a5CB43811e' },
        { contractName: 'CH_PT', address: '0xcFd139735Fb48eB62826f122a2A295C22C9D6670' },
    ]

    for (const { contractName, address } of contracts) {
        await prisma.contract.upsert({
            where: { chainId_contractName: { chainId: '296', contractName } },
            update: { address, isActive: true },
            create: {
                chainId: '296',
                contractName,
                address,
                isActive: true,
            },
        })
        console.log(`Contract upserted: ${contractName} = ${address}`)
    }

    console.log('Hedera Testnet seeding done.')
}

export async function main() {
    await seedHbar()
}
main()

