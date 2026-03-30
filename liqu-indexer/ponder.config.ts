import { createConfig } from "ponder";
import PrincipleTokenABI from "./abis/PrincipleTokenABI";
import PrincipleAssetABI from "./abis/PrincipleAssetABI";
import FundraiseFactoryABI from "./abis/FundraiseFactoryABI";
import { PrincipleRouterABI } from "./abis/PrincipleRouterABI";
import { fallback, http } from "viem";

// load env variables
require("dotenv").config();


export default createConfig({
  database: {
    kind: "postgres",
    connectionString: process.env.DATABASE_URL,
  },
  chains: {
    mainnet: {
      id: 1,
      rpc: "https://eth.llamarpc.com",
    },
    bscTestnet: {
      id: 97,
      rpc: fallback([
        http(process.env.PONDER_RPC_URL_97 || "https://data-seed-prebsc-1-s1.binance.org:8545"),
        http("https://data-seed-prebsc-2-s1.binance.org:8545"),
      ]),
    },
    hederaTestnet: {
      id: 296,
      rpc: "https://testnet.hashio.io/api",
    },
  },
  contracts: {
    PrincipleToken: {
      abi: PrincipleTokenABI,
      chain: {
        bscTestnet: {
          address: process.env.CH_PT! as `0x${string}`,
          startBlock: 40000000,
        },
        hederaTestnet: {
          address: process.env.HBAR_PT! as `0x${string}`,
          startBlock: 33055865
        },
      },
    },
    PrincipleAsset: {
      abi: PrincipleAssetABI,
      chain: {
        bscTestnet: {
          address: process.env.CH_ASSET! as `0x${string}`,
          startBlock: 40000000,
        },
        hederaTestnet: {
          address: process.env.HBAR_ASSET! as `0x${string}`,
          startBlock: 33055865
        },
      },
    },

    FundraiseFactory: {
      abi: FundraiseFactoryABI,
      chain: {
        bscTestnet: {
          address: process.env.CH_FACTORY! as `0x${string}`,
          startBlock: 40000000,
        },
        hederaTestnet: {
          address: process.env.HBAR_FACTORY! as `0x${string}`,
          startBlock: 33055865
        },
      },
    },
    PrincipleRouter: {
      abi: PrincipleRouterABI,
      chain: {
        bscTestnet: {
          address: process.env.SWAP_ROUTER_PT_BSC_TESTNET! as `0x${string}`,
          startBlock: 40000000,
        },
        // hederaTestnet: {
        //   address: process.env.HBAR_ROUTER! as `0x${string}`,
        //   startBlock: 33055865
        // },
      },
    },
  },
});
