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
    bscTestnet: {
      id: 97,
      rpc: fallback([
        http(process.env.PONDER_RPC_URL_97 || "https://data-seed-prebsc-1-s1.binance.org:8545"),
        http("https://data-seed-prebsc-2-s1.binance.org:8545"),
        http("https://rpc.sentio.xyz/bsc-testnet"),
        http("https://bnb-testnet.api.onfinality.io/public"),
        http("https://api.zan.top/bsc-testnet"),
        http("https://bsc-testnet.publicnode.com"),
        http("https://bsc-testnet.drpc.org"),
        http("https://data-seed-prebsc-2-s1.bnbchain.org:8545"),
        http("https://data-seed-prebsc-2-s2.bnbchain.org:8545"),
        http("https://data-seed-prebsc-1-s3.bnbchain.org:8545"),
        http("https://data-seed-prebsc-1-s2.bnbchain.org:8545"),
        http("https://data-seed-prebsc-2-s3.bnbchain.org:8545"),
        http("https://data-seed-prebsc-1-s1.bnbchain.org:8545"),
        http("https://bsc-testnet.therpc.io"),
        http("https://endpoints.omniatech.io/v1/bsc/testnet/public"),
        http("https://bsc-testnet.4everland.org/v1/37fa9972c1b1cd5fab542c7bdd4cde2f"),
        http("https://public.stackup.sh/api/v1/node/bsc-testnet"),
        http("https://bsc-testnet.public.blastapi.io"),
        http("https://bsctestapi.terminet.io/rpc")
      ]),
    },
  },
  contracts: {
    PrincipleToken: {
      abi: PrincipleTokenABI,
      chain: {
        bscTestnet: {
          address: process.env.CH_PT! as `0x${string}`,
          startBlock: 40000000,
        }
      },
    },
    PrincipleAsset: {
      abi: PrincipleAssetABI,
      chain: {
        bscTestnet: {
          address: process.env.CH_ASSET! as `0x${string}`,
          startBlock: 40000000,
        },
      },
    },

    FundraiseFactory: {
      abi: FundraiseFactoryABI,
      chain: {
        bscTestnet: {
          address: process.env.CH_FACTORY! as `0x${string}`,
          startBlock: 40000000,
        }
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
