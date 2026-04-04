// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {PrincipleToken} from "../src/PrincipleToken.sol";
import {PrincipleAsset} from "../src/PrincipleAsset.sol";
import {FundraiseFactory} from "../src/modules/FundraiseFactory.sol";
import {GuardFactory} from "../src/modules/GuardFactory.sol";
import {PrincipleRouter} from "../src/modules/PrincipleRouter.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";

/// @title DeployPrincipleToken2
/// @notice Non-upgradeable deployment of the full PrincipleToken stack.
///
/// Deploy order (no nonce pre-computation needed):
///   1. MockUSD (reused from env)
///   2. PrincipleAsset  — principleToken wired to address(0) initially
///   3. GuardFactory    — operator wired to address(0) initially
///   4. FundraiseFactory — operator wired to address(0) initially
///   5. PrincipleToken  — all addresses now known, single-step deploy
///   6. Wire: asset.setPrincipleToken, guardFactory.setOperator, factory.setOperator
///   7. pt.setPlatformTreasury
///   8. PrincipleRouter  — standalone, no wiring needed
///
/// Usage:
///   forge script script/DeployPrincipleToken2.s.sol \
///     --rpc-url $BSC_TESTNET_RPC_URL \
///     --broadcast \
///     -vvvv
///
/// Required env vars:
///   PRIVATE_KEY
///   POSITION_MANAGER_ADDRESS
///   SWAP_ROUTER_ADDRESS
///   MOCK_USDC_ADDRESS
///   PLATFORM_TREASURY
///   BSC_TESTNET_RPC_URL
contract DeployPrincipleToken2 is Script {
    // ─── Deployed contracts ────────────────────────────────────────────────────
    MockUSD public usdc;
    GuardFactory public guardFactory;
    FundraiseFactory public factory;
    PrincipleAsset public asset;
    PrincipleToken public pt;
    PrincipleRouter public router;

    // ─── Config ────────────────────────────────────────────────────────────────
    uint256 public deployerPk = vm.envUint("PRIVATE_KEY");
    address public deployer;

    address public positionManager = vm.envAddress("POSITION_MANAGER_ADDRESS");
    address public swapRouter02 = vm.envAddress("SWAP_ROUTER_ADDRESS");
    address public treasury = vm.envOr("PLATFORM_TREASURY", address(0));

    function run() public {
        deployer = vm.addr(deployerPk);
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
        // [1] Reuse existing MockUSD
        usdc = MockUSD(vm.envAddress("MOCK_USDC_ADDRESS"));
        console.log("[1/8] MockUSD             :", address(usdc));

        // [2] PrincipleAsset — principleToken = address(0), wired in step 6
        asset = new PrincipleAsset(deployer, address(0), "AssetToken", "ATOK");
        console.log("[2/8] PrincipleAsset      :", address(asset));

        // [3] GuardFactory — operator = address(0), wired in step 6
        guardFactory = new GuardFactory(
            address(0),
            address(usdc),
            positionManager
        );
        console.log("[3/8] GuardFactory        :", address(guardFactory));

        // [4] FundraiseFactory — operator = address(0), wired in step 6
        factory = new FundraiseFactory(
            address(0),
            address(usdc),
            address(asset),
            address(0)
        );
        console.log("[4/8] FundraiseFactory    :", address(factory));

        // [5] PrincipleToken — all addresses now known
        pt = new PrincipleToken(
            deployer, // adminOwner
            deployer, // admin
            "ipfs://", // base URI
            address(asset),
            address(factory),
            address(usdc),
            address(guardFactory),
            positionManager
        );
        console.log("[5/8] PrincipleToken      :", address(pt));

        // [6] Wire everything — no nonce tricks needed
        asset.setPrincipleToken(address(pt));
        console.log("      asset.principleToken wired to:", address(pt));

        guardFactory.setOperator(address(pt));
        console.log("      guardFactory.operator wired to:", address(pt));

        factory.setOperator(address(pt));
        console.log("      factory.operator wired to:", address(pt));

        // [7] Set platform treasury
        pt.setPlatformTreasury(treasury);
        console.log("[7/8] platformTreasury    :", treasury);

        // [8] PrincipleRouter — standalone
        router = new PrincipleRouter(swapRouter02, address(usdc));
        console.log("[8/8] PrincipleRouter     :", address(router));
    }

    function _printSummary() internal view {
        console.log("");
        console.log(
            "==========================================================="
        );
        console.log("  DEPLOYMENT COMPLETE - Non-Upgradeable Stack");
        console.log(
            "==========================================================="
        );
        console.log("MockUSD (settlement)  :", address(usdc));
        console.log("GuardFactory          :", address(guardFactory));
        console.log("FundraiseFactory      :", address(factory));
        console.log("PrincipleAsset        :", address(asset));
        console.log("PrincipleToken        :", address(pt));
        console.log("PrincipleRouter       :", address(router));
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
                vm.toString(address(pt)),
                " 'registerProperty(string)' 'ipfs://your-metadata'",
                " --rpc-url $BSC_TESTNET_RPC_URL --private-key $PRIVATE_KEY"
            )
        );
        console.log(
            "  => Note the tokenId emitted in the PropertyRegistered event"
        );
        console.log("");
        console.log("Step B - Approve the ERC-721 for transfer:");
        console.log("  Replace <TOKEN_ID> with the tokenId from Step A");
        console.log(
            string.concat(
                "  cast send ",
                vm.toString(address(asset)),
                " 'approve(address,uint256)' ",
                vm.toString(address(pt)),
                " <TOKEN_ID>",
                " --rpc-url $BSC_TESTNET_RPC_URL --private-key $PRIVATE_KEY"
            )
        );
        console.log("");
        console.log(
            "==========================================================="
        );
    }
}
