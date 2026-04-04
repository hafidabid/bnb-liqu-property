// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {PrincipleToken} from "../src/PrincipleToken.sol";
import {PrincipleAsset} from "../src/PrincipleAsset.sol";
import {
    PositionInput,
    PrincipleSupply,
    FeeType
} from "../src/libraries/Structs.sol";

import {FundraiseFactory} from "../src/modules/FundraiseFactory.sol";
import {GuardFactory} from "../src/modules/GuardFactory.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";

/// @title TestDeployedPrincipleToken
/// @notice Updated for non-upgradeable contracts — no proxy/nonce tricks.
contract TestDeployedPrincipleToken is Test {
    address constant PLATFORM_TREASURY =
        0xA48f970da664BB3B5617DE2888F65BAB03A932aA;

    uint256 deployerPk;
    address deployer;
    PrincipleToken pt;
    PrincipleAsset asset;

    MockUSD usdc;
    GuardFactory guardFactory;
    FundraiseFactory factory;

    address positionManager;

    function setUp() public {
        string memory rpcUrl = vm.envString("BASE_SEPOLIA_RPC_URL");
        vm.createSelectFork(rpcUrl);

        deployerPk = vm.envUint("DEPLOYER_WALLET_PRIVATE_KEY");
        deployer = vm.addr(deployerPk);
        positionManager = vm.envAddress("BASE_SEPOLIA_POSITION_MANAGER");

        vm.startPrank(deployer);

        usdc = new MockUSD();

        // Deploy asset with placeholder principleToken (wired after pt)
        asset = new PrincipleAsset(deployer, address(0), "AssetToken", "ATOK");

        // Deploy factories with placeholder operator (wired after pt)
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

        // Wire
        asset.setPrincipleToken(address(pt));
        guardFactory.setOperator(address(pt));
        factory.setOperator(address(pt));

        pt.setPlatformTreasury(PLATFORM_TREASURY);

        vm.stopPrank();

        console.log("Deployed PT :", address(pt));
        console.log("Deployed Asset:", address(asset));
        console.log("Starting test with caller:", deployer);
    }

    /// @notice Tests that invalid BPS configuration reverts
    function test_RevertInvalidYieldBPS() public {
        vm.startPrank(deployer);

        PositionInput memory invalidInput = PositionInput({
            tokenId: 1,
            presaleAmount: 11000,
            deadline: block.timestamp + 1 days,
            totalSupply: PrincipleSupply.FIRST,
            presalePrice: 100e6,
            holderYieldBPS: 9000,
            baselineYieldBPS: 1000,
            yieldPeriodSeconds: 30 * 24 * 60 * 60,
            reportPeriodSeconds: 30 * 24 * 60 * 60,
            feeType: FeeType.YIELD_PERCENTAGE
        });

        vm.expectRevert();
        pt.mintPrinciple(invalidInput);

        vm.stopPrank();
    }

    /// @notice Happy path test: registerProperty -> approve -> mintPrinciple
    function test_HappyPathRegisterAndMint() public {
        vm.startPrank(deployer);

        string memory uri = "ipfs://test-property-uri-123";
        uint256 tokenId = pt.registerProperty(uri);
        console.log("Registered Property. New Token ID:", tokenId);

        assertEq(
            asset.ownerOf(tokenId),
            deployer,
            "Deployer should own the new asset"
        );

        asset.approve(address(pt), tokenId);
        console.log("Asset approved for PT");

        PositionInput memory validInput = PositionInput({
            tokenId: tokenId,
            presaleAmount: 5000,
            deadline: block.timestamp + 7 days,
            totalSupply: PrincipleSupply.FIRST,
            presalePrice: 100e6,
            holderYieldBPS: 8000,
            baselineYieldBPS: 1000,
            yieldPeriodSeconds: 30 days,
            reportPeriodSeconds: 30 days,
            feeType: FeeType.YIELD_PERCENTAGE
        });

        pt.mintPrinciple(validInput);
        console.log(
            "Successfully minted Principle Tokens for Token ID:",
            tokenId
        );

        address newOwner = asset.ownerOf(tokenId);
        assertTrue(
            newOwner != deployer,
            "Deployer should no longer own the asset"
        );

        vm.stopPrank();
    }
}
