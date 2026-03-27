export const PrincipleRouterABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "router_",
        type: "address",
        internalType: "address",
      },
      {
        name: "usdc_",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "FEE_TIER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint24",
        internalType: "uint24",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "swap",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct RouterInput",
        components: [
          {
            name: "token0",
            type: "address",
            internalType: "address",
          },
          {
            name: "zeroForOne",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "amountIn",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amountOut",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "swapRouter",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ISwapRouter02",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "DeadlineExceeded",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidInitialization",
    inputs: [],
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: [],
  },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
  },
] as const;
