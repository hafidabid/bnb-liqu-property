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
    baseSepolia: {
      id: 84532,
      rpc: fallback([
        http("https://base-sepolia-rpc.publicnode.com"),
        http("https://base-sepolia.api.onfinality.io/public"),
        http("https://base-testnet.api.pocket.network"),
        http("https://base-sepolia-public.nodies.app"),
        http("https://rpc.sentio.xyz/base-sepolia"),
        http("https://base-sepolia.gateway.tenderly.co"),
        http("https://base-sepolia.drpc.org"),
        http("https://sepolia.base.org"),
        http("https://base-sepolia.therpc.io"),
        http("https://public.stackup.sh/api/v1/node/base-sepolia"),
        http("https://rpc.notadegen.com/base/sepolia"),
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
        baseSepolia: {
          address: process.env.CH_PT! as `0x${string}`,
          startBlock: 38438500,
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
        baseSepolia: {
          address: process.env.CH_ASSET! as `0x${string}`,
          startBlock: 38438500,
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
        baseSepolia: {
          address: process.env.CH_FACTORY! as `0x${string}`,
          startBlock: 38438500,
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
        baseSepolia: {
          address: process.env.SWAP_ROUTER_PT_BASE_SEPOLIA! as `0x${string}`,
          startBlock: 38438500,
        },
        // hederaTestnet: {
        //   address: process.env.HBAR_ROUTER! as `0x${string}`,
        //   startBlock: 33055865
        // },
      },
    },
  },
});
