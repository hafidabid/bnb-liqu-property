// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {PrincipleToken} from "../src/PrincipleToken.sol";
import {PrincipleAsset} from "../src/PrincipleAsset.sol";
import {FundraiseFactory} from "../src/modules/FundraiseFactory.sol";
import {GuardFactory} from "../src/modules/GuardFactory.sol";
import {PrincipleRouter} from "../src/modules/PrincipleRouter.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {
    TransparentUpgradeableProxy
} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/// @title DeployPrincipleToken2
/// @notice Experiment / isolated deployment of the full PrincipleToken stack.
///         Differences from PrincipleToken.s.sol:
///           1. No fragile nonce pre-computation.  Addresses are wired AFTER
///              both proxies are deployed, using `PrincipleAsset.setPrincipleToken`.
///           2. `setPlatformTreasury` is called automatically during deployment.
///           3. Console output includes the exact `cast send` commands for the
///              manual steps that follow (approve + mintPrinciple).
///
/// Usage:
///   forge script script/DeployPrincipleToken2.s.sol \
///     --rpc-url $BASE_SEPOLIA_RPC_URL \
///     --broadcast \
///     --verify \
///     -vvvv
///
/// Required env vars (same as the original script):
///   CHAINLINK_DEPLOYER_PK
///   BASE_SEPOLIA_POSITION_MANAGER
///   SWAP_ROUTER_02_BASE_SEPOLIA
///   PLATFORM_TREASURY          ← address that receives platform fees (NEW)
///
/// Optional env var:
///   BASE_SEPOLIA_RPC_URL       (only needed for --fork-url / setUp)
contract DeployPrincipleToken2 is Script {
    // ─── Deployed contracts ────────────────────────────────────────────────────
    MockUSD public usdc;
    GuardFactory public guardFactory;
    FundraiseFactory public factory;
    PrincipleAsset public assetProxy;
    PrincipleToken public ptProxy;
    PrincipleRouter public routerProxy;

    // ─── Config ────────────────────────────────────────────────────────────────
    uint256 public deployerPk = vm.envUint("CHAINLINK_DEPLOYER_PK");
    address public deployer;

    address public positionManager =
        vm.envAddress("BASE_SEPOLIA_POSITION_MANAGER");
    address public swapRouter02 = vm.envAddress("SWAP_ROUTER_02_BASE_SEPOLIA");

    /// Treasury address that will receive platform fees (0.5 % of every mint).
    /// Set PLATFORM_TREASURY in your .env or pass --sig 'run(address)' to override.
    address public treasury = vm.envOr("PLATFORM_TREASURY", address(0));

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_SEPOLIA_RPC_URL"));
    }

    function run() public {
        deployer = vm.addr(deployerPk);

        // ── Safety check ──────────────────────────────────────────────────────
        require(treasury != address(0), "Set PLATFORM_TREASURY in your .env");

        vm.startBroadcast(deployerPk);

        _deployAll();

        vm.stopBroadcast();

        _printSummary();
    }

    // =========================================================================
    // INTERNAL
    // =========================================================================

    function _deployAll() internal {
        // 1. MockUSD (settlement token — replace with real USDC on production)
        usdc = new MockUSD();
        console.log("[1/8] MockUSD             :", address(usdc));

        // 2. PrincipleAsset implementation + proxy
        //    Note: principleToken is set to address(0) initially — wired in step 6.
        PrincipleAsset assetImpl = new PrincipleAsset();
        console.log("[2/8] PrincipleAsset impl :", address(assetImpl));

        bytes memory assetInitData = abi.encodeWithSignature(
            "initialize(address,address,string,string)",
            deployer,
            address(0), // principleToken wired AFTER PT proxy is known
            "AssetToken",
            "ATOK"
        );
        assetProxy = PrincipleAsset(
            address(
                new TransparentUpgradeableProxy(
                    address(assetImpl),
                    deployer,
                    assetInitData
                )
            )
        );
        console.log("[3/8] PrincipleAsset proxy:", address(assetProxy));

        // 3. PrincipleToken implementation (needs asset + factory + usdc + guard + posManager)
        //    Factory and guard are deployed first because PT impl constructor is immutable.
        //    We pass a placeholder (assetProxy) for factory/guard addresses that need PT —
        //    see step 5 & 6 for the actual wiring.
        //
        //    Deployment order:
        //      guardFactory ← needs PT address → placeholder = address(0), wired after
        //      factory      ← needs PT address → placeholder = address(0), wired after
        //
        //    Since GuardFactory and FundraiseFactory store the operator/principleToken as
        //    immutables we cannot change them post-deploy.  Instead we deploy them
        //    AFTER we know the PT proxy address (two-proxy trick using CREATE2 or
        //    simply deploying assetProxy first then computing PT's proxy address via
        //    a lightweight pre-compute of the NEXT two nonces).
        //
        //    Concretely the order is:
        //      assetImpl(A)  → assetProxy(B) → ptImpl(C) → ptProxy(D=nonce+3 from A)
        //      guardFactory must know D, factory must know D.
        //      We get D by computing nonce+3 from the deployer's current nonce (after B).
        //
        //    This is a ONE-step pre-compute over only 2 hops (ptImpl + ptProxy),
        //    which is far more reliable than the original 6-hop offset.

        uint64 nonceAfterAssetProxy = vm.getNonce(deployer);
        // Next: guardFactory (+0), factory (+1), ptImpl (+2), ptProxy (+3)  →  ptProxy = nonce + 3
        address predictedPtProxy = vm.computeCreateAddress(
            deployer,
            nonceAfterAssetProxy + 3
        );
        console.log("[4/8] Predicted PT proxy  :", predictedPtProxy);

        // Now we can deploy guardFactory and factory with the correct operator address.
        guardFactory = new GuardFactory(
            predictedPtProxy,
            address(usdc),
            positionManager
        );
        console.log("[5/8] GuardFactory        :", address(guardFactory));

        factory = new FundraiseFactory(
            predictedPtProxy,
            address(usdc),
            address(assetProxy),
            predictedPtProxy
        );
        console.log("[6/8] FundraiseFactory    :", address(factory));

        // 4. PrincipleToken implementation
        PrincipleToken ptImpl = new PrincipleToken(
            address(assetProxy),
            address(factory),
            address(usdc),
            address(guardFactory),
            positionManager
        );
        console.log("[7/8] PrincipleToken impl :", address(ptImpl));

        // 5. PrincipleToken proxy  ← must land at predictedPtProxy
        bytes memory ptInitData = abi.encodeWithSignature(
            "initialize(address,address,string)",
            deployer, // owner
            deployer, // admin
            "ipfs://" // base URI
        );
        ptProxy = PrincipleToken(
            address(
                new TransparentUpgradeableProxy(
                    address(ptImpl),
                    deployer,
                    ptInitData
                )
            )
        );
        require(
            address(ptProxy) == predictedPtProxy,
            "PT proxy address prediction failed - nonce drift"
        );
        console.log("[8/8] PrincipleToken proxy:", address(ptProxy));

        // ── Wire PrincipleAsset → PrincipleToken (the fix for root cause #1) ──
        assetProxy.setPrincipleToken(address(ptProxy));
        console.log(
            "      PrincipleAsset.principleToken wired to:",
            address(ptProxy)
        );

        // ── Set platform treasury (the fix for root cause #2) ─────────────────
        ptProxy.setPlatformTreasury(treasury);
        console.log("      platformTreasury set to:", treasury);

        // ── (Optional) Deploy the swap router proxy ────────────────────────────
        PrincipleRouter routerImpl = new PrincipleRouter(
            swapRouter02,
            address(usdc)
        );
        bytes memory routerInitData = abi.encodeWithSignature("initialize()");
        routerProxy = PrincipleRouter(
            address(
                new TransparentUpgradeableProxy(
                    address(routerImpl),
                    deployer,
                    routerInitData
                )
            )
        );
        console.log("      PrincipleRouter proxy:", address(routerProxy));
    }

    function _printSummary() internal view {
        console.log("");
        console.log(
            "==========================================================="
        );
        console.log("  EXPERIMENT DEPLOYMENT COMPLETE - DeployPrincipleToken2");
        console.log(
            "==========================================================="
        );
        console.log("MockUSD (settlement)  :", address(usdc));
        console.log("GuardFactory          :", address(guardFactory));
        console.log("FundraiseFactory      :", address(factory));
        console.log("PrincipleAsset (proxy):", address(assetProxy));
        console.log("PrincipleToken (proxy):", address(ptProxy));
        console.log("PrincipleRouter(proxy):", address(routerProxy));
        console.log("platformTreasury      :", treasury);
        console.log("");
        console.log(
            "-----------------------------------------------------------"
        );
        console.log("  POST-DEPLOY MANUAL STEPS");
        console.log(
            "-----------------------------------------------------------"
        );
        console.log("");
        console.log("Step A - Register a property (call from your wallet):");
        console.log(
            string.concat(
                "  cast send ",
                vm.toString(address(ptProxy)),
                " 'registerProperty(string)' 'ipfs://your-metadata'",
                " --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $CHAINLINK_DEPLOYER_PK"
            )
        );
        console.log(
            "  => Note the tokenId emitted in the PropertyRegistered event"
        );
        console.log("");
        console.log(
            "Step B - Approve the ERC-721 for transfer (ROOT CAUSE #3 FIX):"
        );
        console.log("  Replace <TOKEN_ID> with the tokenId from Step A");
        console.log(
            string.concat(
                "  cast send ",
                vm.toString(address(assetProxy)),
                " 'approve(address,uint256)' ",
                vm.toString(address(ptProxy)),
                " <TOKEN_ID>",
                " --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $CHAINLINK_DEPLOYER_PK"
            )
        );
        console.log("");
        console.log("Step C - Mint principle tokens:");
        console.log(
            "  (totalSupply: 1=FIRST/10k, 2=SECOND/100k | presaleAmount: BPS 0-10000)"
        );
        console.log(
            "  See PositionInput struct in src/libraries/Structs.sol for full params."
        );
        console.log("");
        console.log(
            "==========================================================="
        );
    }
}
