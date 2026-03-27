/**
 * Test flow for Router swap with yieldToken (matches Solidity test).
 * - alice approves USDC to router (type(uint128).max), then calls router.swap(input).
 * - RouterInput: token0 = yieldToken, zeroForOne: false, amountIn: 10e6, amountOut: 0, deadline.
 */
import 'dotenv/config'
import { baseSepolia } from 'viem/chains'
import {
  createSwapTx,
  submitSwapTx,
} from '../app/services/contracts/lib/swap/swap.js'
import { dealUSDC } from '../app/services/contracts/lib/deal/deal.js'
import { aliceWalletClient } from '../app/services/contracts/client/walletClient.js'
import publicClient from '../app/services/contracts/client/publicClient.js'
import { CONTRACT_ADDRESSES } from '../app/services/contracts/addresses.js'
import MockUSDCABI from '../app/services/contracts/abis/MockUSDCABI.js'

const CHAIN_ID = baseSepolia.id

/** yieldToken address to test (from position) */
const YIELD_TOKEN_ADDRESS =
  '0x75a7D033916cf519fE57528B63687D762dCe0676' as `0x${string}`

/** type(uint128).max */
const MAX_UINT128 = 2n ** 128n - 1n

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function runTestFlow() {
  const aliceAddress = aliceWalletClient.account!.address

  console.log('=== Test flow: swap (yieldToken, alice) ===')
  console.log('Alice:', aliceAddress)
  console.log('Yield token (token0):', YIELD_TOKEN_ADDRESS)

  // --- 1. Deal USDC to alice ---
  console.log('\n--- 1. deal USDC to alice ---')
  const amountIn = 10 * 1e6
  await dealUSDC(BigInt(amountIn * 2), aliceAddress)
  console.log('Dealt USDC to alice')
  console.log('Waiting 5 seconds...')
  await delay(5_000)

  // --- 2. Alice approves USDC to router (IERC20(usdc).approve(router, type(uint128).max)) ---
  console.log('\n--- 2. alice approves USDC to router ---')
  const routerAddress = CONTRACT_ADDRESSES[84532]
    .SWAP_ROUTER_PT_BASE_SEPOLIA as `0x${string}`
  const usdcAddress = CONTRACT_ADDRESSES[84532].CH_USDC as `0x${string}`

  const approveTxHash = await aliceWalletClient.writeContract({
    chain: baseSepolia,
    account: aliceWalletClient.account!,
    address: usdcAddress,
    abi: MockUSDCABI,
    functionName: 'approve',
    args: [routerAddress, MAX_UINT128],
  })
  console.log('approve(router, type(uint128).max) tx:', approveTxHash)
  await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
  console.log('Waiting 5 seconds...')
  await delay(5_000)

  // --- 3. Router swap (alice) ---
  console.log('\n--- 3. router.swap(input) ---')
  const deadline =
    Math.floor(Math.random() * 1e9) + Math.floor(Date.now() / 1000)

  const input = {
    token0: YIELD_TOKEN_ADDRESS,
    zeroForOne: false,
    amountIn: 10 * 1e6,
    amountOut: 0,
    deadline,
  }
  console.log('RouterInput:', {
    token0: input.token0,
    zeroForOne: input.zeroForOne,
    amountIn: input.amountIn,
    amountOut: input.amountOut,
    deadline: input.deadline,
  })

  const swapTxRequest = await createSwapTx(input, aliceAddress)
  console.log('READY TO SIGN SWAP')
  const signedSwap = await aliceWalletClient.signTransaction({
    account: aliceWalletClient.account!,
    chainId: CHAIN_ID,
    ...swapTxRequest,
  })
  console.log('SIGNED SWAP')
  const swapTxHash = await submitSwapTx(signedSwap)
  console.log('swap tx:', swapTxHash)
  await publicClient.waitForTransactionReceipt({ hash: swapTxHash })
  console.log('Waiting 5 seconds...')
  await delay(5_000)

  console.log('\n=== Test flow completed successfully ===')
}

runTestFlow().catch(err => {
  console.error('Test flow failed:', err)
  process.exit(1)
})
