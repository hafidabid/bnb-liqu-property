// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {PrincipleToken} from "../src/PrincipleToken.sol";
import {PrincipleAsset} from "../src/PrincipleAsset.sol";
import {FundraiseFactory} from "../src/modules/FundraiseFactory.sol";
import {GuardFactory} from "../src/modules/GuardFactory.sol";
import {PrincipleRouter} from "../src/modules/PrincipleRouter.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";

/// @notice Legacy deploy script — updated for non-upgradeable contracts.
/// Use DeployPrincipleToken2.s.sol for the canonical deploy.
contract PrincipleTokenScript is Script {
    PrincipleToken public pt;
    PrincipleAsset public asset;
    PrincipleRouter public pr;
    FundraiseFactory public factory;
    MockUSD public usdc;
    GuardFactory public guardFactory;

    uint256 public privateKey = vm.envUint("CHAINLINK_DEPLOYER_PK");
    address public positionManager =
        vm.envAddress("BASE_SEPOLIA_POSITION_MANAGER");
    address public swapRouter02 = vm.envAddress("SWAP_ROUTER_02_BASE_SEPOLIA");

    function setUp() public {
        vm.createSelectFork(vm.envString("BSC_TESTNET_RPC_URL"));
    }

    function run() public {
        address deployer = vm.addr(privateKey);
        vm.startBroadcast(privateKey);

        usdc = new MockUSD();

        // Deploy asset with placeholder principleToken (wired after pt deployed)
        asset = new PrincipleAsset(deployer, address(0), "AssetToken", "AT");

        // Deploy factories with placeholder operator (wired after pt deployed)
        guardFactory = new GuardFactory(
            address(0),
            address(usdc),
            positionManager
        );
        factory = new FundraiseFactory(
            address(0),
            address(usdc),
            address(asset),
            address(0)
        );

        // Deploy PrincipleToken — all addresses now known
        pt = new PrincipleToken(
            deployer,
            deployer,
            "ipfs://",
            address(asset),
            address(factory),
            address(usdc),
            address(guardFactory),
            positionManager
        );

        // Wire everything
        asset.setPrincipleToken(address(pt));
        guardFactory.setOperator(address(pt));
        factory.setOperator(address(pt));

        // Router
        pr = new PrincipleRouter(swapRouter02, address(usdc));

        console.log("usdc         :", address(usdc));
        console.log("guardFactory :", address(guardFactory));
        console.log("factory      :", address(factory));
        console.log("asset        :", address(asset));
        console.log("pt           :", address(pt));
        console.log("router       :", address(pr));

        vm.stopBroadcast();
    }
}
