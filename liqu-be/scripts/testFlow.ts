/**
 * Test flow: mintAsset -> mintPrinciple -> buyPresale -> deployGuard
 * - userWalletClient = lister (mints principle, deploys guard)
 * - aliceWalletClient = buyer (buys presale)
 * - deadline is filled with a random number (feature disabled)
 */
import 'dotenv/config'
import { baseSepolia } from 'viem/chains'
import mintAsset, {
  getNextAssetTokenId,
} from '../app/services/contracts/lib/mint/mintAsset.js'
import {
  approveMintPrinciple,
  createMintPrincipleTx,
  submitMintPrincipleTx,
  ptTokenId,
} from '../app/services/contracts/lib/mint/mintPrinciple.js'
import {
  createPresaleTx,
  submitPresaleTx,
  approveUSDCForBuyer,
} from '../app/services/contracts/lib/presale/presale.js'
import {
  createDeployGuardTx,
  submitDeployGuardTx,
} from '../app/services/contracts/lib/deployGuard/deployGuard.js'
import { dealUSDC } from '../app/services/contracts/lib/deal/deal.js'
import {
  userWalletClient,
  aliceWalletClient,
} from '../app/services/contracts/client/walletClient.js'
import publicClient from '../app/services/contracts/client/publicClient.js'

const CHAIN_ID = baseSepolia.id

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function runTestFlow() {
  const listerAddress = userWalletClient.account!.address
  const aliceAddress = aliceWalletClient.account!.address

  console.log(
    '=== Test flow: mintAsset -> mintPrinciple -> buyPresale -> deployGuard ==='
  )
  console.log('Lister (user):', listerAddress)
  console.log('Buyer (alice):', aliceAddress)

  // --- 1. Mint asset to lister ---
  console.log('\n--- 1. mintAsset (to lister) ---')
  const nextAssetId = await getNextAssetTokenId()
  console.log('Next asset token id (will be minted):', nextAssetId)

  const mintAssetTxHash = await mintAsset(listerAddress)
  console.log('mintAsset tx:', mintAssetTxHash)
  await publicClient.waitForTransactionReceipt({ hash: mintAssetTxHash })
  console.log('Waiting 5 seconds...')
  await delay(5_000)
  const assetTokenId = nextAssetId
  console.log('Minted asset token id:', assetTokenId)

  // --- 2. Mint principle (lister approves asset then mints) ---
  console.log('\n--- 2. mintPrinciple (lister) ---')
  await approveMintPrinciple(assetTokenId)
  console.log('Approved CH_PT for asset token id', assetTokenId)
  console.log('Waiting 5 seconds...')
  await delay(5_000)
  const deadline =
    Math.floor(Math.random() * 1e9) + Math.floor(Date.now() / 1000)
  const mintPrincipleInput = {
    totalSupply: 2,
    presaleAmount: 2000,
    deadline,
    tokenId: assetTokenId,
    presalePrice: 1_000 * 1e6, // 1,000,000 USDC (6 decimals)
  }
  const mintPrincipleTxRequest = await createMintPrincipleTx(
    mintPrincipleInput,
    listerAddress
  )
  console.log('READY TO SIGN')
  const signedMintPrinciple = await userWalletClient.signTransaction({
    account: userWalletClient.account!,
    chainId: CHAIN_ID,
    ...mintPrincipleTxRequest,
  })
  console.log('SIGNED')
  const mintPrincipleTxHash = await submitMintPrincipleTx(signedMintPrinciple)
  console.log('mintPrinciple tx:', mintPrincipleTxHash)
  await publicClient.waitForTransactionReceipt({ hash: mintPrincipleTxHash })
  console.log('Waiting 5 seconds...')
  await delay(5_000)

  const principleTokenId = await ptTokenId()
  console.log('Principle token id:', Number(principleTokenId))

  // --- 3. Buy presale (alice = buyer) ---
  console.log('\n--- 3. buyPresale (alice = buyer) ---')
  const presaleAmount = 2000
  const presaleAmountUSDC = presaleAmount * 1_000 * 1e6 // 6 decimals

  await dealUSDC(BigInt(presaleAmountUSDC), aliceAddress)
  console.log('Dealt USDC to alice for presale')
  console.log('Waiting 5 seconds...')
  await delay(5_000)

  await approveUSDCForBuyer(presaleAmountUSDC)
  console.log('Alice approved USDC for CH_PT')
  console.log('Waiting 5 seconds...')
  await delay(5_000)

  const presaleTxRequest = await createPresaleTx(
    { tokenId: Number(principleTokenId), amount: presaleAmount },
    aliceAddress
  )
  const signedPresale = await aliceWalletClient.signTransaction({
    account: aliceWalletClient.account!,
    chainId: CHAIN_ID,
    ...presaleTxRequest,
  })
  const presaleTxHash = await submitPresaleTx(signedPresale)
  console.log('buyPresale tx:', presaleTxHash)
  await publicClient.waitForTransactionReceipt({ hash: presaleTxHash })
  console.log('Waiting 5 seconds...')
  await delay(5_000)

  // --- 4. Deploy guard (lister) ---
  console.log('\n--- 4. deployGuard (lister) ---')
  const deployGuardInput = {
    name: 'Test Guard',
    symbol: 'TGRD',
    tokenId: Number(principleTokenId),
    price: 1e6,
    floorPrice: 0.9e6,
  }
  const deployGuardTxRequest = await createDeployGuardTx(
    deployGuardInput,
    listerAddress
  )
  console.log('READY TO SIGN DEPLOY GUARD')
  const signedDeployGuard = await userWalletClient.signTransaction({
    account: userWalletClient.account!,
    chainId: CHAIN_ID,
    ...deployGuardTxRequest,
  })
  console.log('SIGNED DEPLOY GUARD')
  const deployGuardTxHash = await submitDeployGuardTx(signedDeployGuard)
  console.log('deployGuard tx:', deployGuardTxHash)
  await publicClient.waitForTransactionReceipt({ hash: deployGuardTxHash })

  console.log('\n=== Test flow completed successfully ===')
}

runTestFlow().catch(err => {
  console.error('Test flow failed:', err)
  process.exit(1)
})
