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
import {
    TransparentUpgradeableProxy
} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/// @title TestDeployedPrincipleToken
/// @notice Test to verify registerProperty and mintPrinciple on a local deployment of PrincipleToken
contract TestDeployedPrincipleToken is Test {
    // ==========================================
    // REQUIRED: Fill these in before running
    // ==========================================
    // create new wallet for platfrom treasury
    address constant PLATFORM_TREASURY =
        0xA48f970da664BB3B5617DE2888F65BAB03A932aA;

    address PT_PROXY;
    address ASSET_PROXY;

    uint256 deployerPk;
    address deployer;
    PrincipleToken pt;
    PrincipleAsset asset;

    MockUSD usdc;
    GuardFactory guardFactory;
    FundraiseFactory factory;

    address positionManager;

    function setUp() public {
        // Create and select fork of Base Sepolia
        string memory rpcUrl = vm.envString("BASE_SEPOLIA_RPC_URL");
        vm.createSelectFork(rpcUrl);

        deployerPk = vm.envUint("DEPLOYER_WALLET_PRIVATE_KEY");
        deployer = vm.addr(deployerPk);
        positionManager = vm.envAddress("BASE_SEPOLIA_POSITION_MANAGER");

        vm.startPrank(deployer);

        // 1. MockUSD
        usdc = new MockUSD();

        // 2. PrincipleAsset implementation + proxy
        PrincipleAsset assetImpl = new PrincipleAsset();
        bytes memory assetInitData = abi.encodeWithSignature(
            "initialize(address,address,string,string)",
            deployer,
            address(0), // wired later
            "AssetToken",
            "ATOK"
        );
        asset = PrincipleAsset(
            address(
                new TransparentUpgradeableProxy(
                    address(assetImpl),
                    deployer,
                    assetInitData
                )
            )
        );
        ASSET_PROXY = address(asset);

        // 3. PrincipleToken implementation (needs prediction for PT proxy)
        uint64 nonceAfterAssetProxy = vm.getNonce(deployer);

        // Next: guardFactory (+0), factory (+1), ptImpl (+2), ptProxy (+3)
        address predictedPtProxy = vm.computeCreateAddress(
            deployer,
            nonceAfterAssetProxy + 3
        );

        guardFactory = new GuardFactory(
            predictedPtProxy,
            address(usdc),
            positionManager
        );

        factory = new FundraiseFactory(
            predictedPtProxy,
            address(usdc),
            address(asset),
            predictedPtProxy
        );

        // 4. PrincipleToken implementation
        PrincipleToken ptImpl = new PrincipleToken(
            address(asset),
            address(factory),
            address(usdc),
            address(guardFactory),
            positionManager
        );

        // 5. PrincipleToken proxy
        bytes memory ptInitData = abi.encodeWithSignature(
            "initialize(address,address,string)",
            deployer,
            deployer,
            "ipfs://"
        );
        pt = PrincipleToken(
            address(
                new TransparentUpgradeableProxy(
                    address(ptImpl),
                    deployer,
                    ptInitData
                )
            )
        );
        PT_PROXY = address(pt);

        require(
            PT_PROXY == predictedPtProxy,
            "PT proxy address prediction failed"
        );

        // Wire Asset -> PT
        asset.setPrincipleToken(PT_PROXY);

        // Set platform treasury
        pt.setPlatformTreasury(PLATFORM_TREASURY);

        vm.stopPrank();

        console.log("Deployed PT Proxy:", PT_PROXY);
        console.log("Deployed Asset Proxy:", ASSET_PROXY);
        console.log("Starting test with caller:", deployer);
    }

    /// @notice Tests that invalid BPS configuration reverts
    function test_RevertInvalidYieldBPS() public {
        vm.startPrank(deployer);

        // Validation check: presaleAmount <= 10_000 (BPS)
        // Validation check: If feeType == YIELD_PERCENTAGE(0): holderYieldBPS + baselineYieldBPS <= 9700
        PositionInput memory invalidInput = PositionInput({
            tokenId: 1,
            presaleAmount: 11000, // INVALID: > 10000
            deadline: block.timestamp + 1 days,
            totalSupply: PrincipleSupply.FIRST,
            presalePrice: 100e6,
            holderYieldBPS: 9000,
            baselineYieldBPS: 1000, // Total: 10000 (INVALID for YIELD_PERCENTAGE, must be <= 9700)
            yieldPeriodSeconds: 30 * 24 * 60 * 60,
            reportPeriodSeconds: 30 * 24 * 60 * 60,
            feeType: FeeType.YIELD_PERCENTAGE
        });

        // Expecing the contract to revert because of the invalid input
        vm.expectRevert();
        pt.mintPrinciple(invalidInput);

        vm.stopPrank();
    }

    /// @notice Happy path test: registerProperty -> approve -> mintPrinciple
    function test_HappyPathRegisterAndMint() public {
        vm.startPrank(deployer);

        // -- Step 1: Register Property --
        // Increments tokenId, mints an ERC721 via principleAsset.mint(msg.sender)
        // No access control — anyone can call it
        string memory uri = "ipfs://test-property-uri-123";
        uint256 tokenId = pt.registerProperty(uri);
        console.log("Registered Property. New Token ID:", tokenId);

        // Validate the caller now owns the NFT
        assertEq(
            asset.ownerOf(tokenId),
            deployer,
            "Deployer should own the new asset"
        );

        // -- Step 2: Approve ERC721 --
        // To call mintPrinciple, the caller must own the ERC721 and approve the PT contract to spend it.
        // We approve the PrincipleToken Proxy address.
        asset.approve(PT_PROXY, tokenId);
        console.log("Asset approved for PT proxy");

        // -- Step 3: Mint Principle --
        // Building valid input based on validations:
        // - presaleAmount <= 10000 -> 5000 (50%)
        // - totalSupply != NULL -> PrincipleSupply.FIRST (10k tokens)
        // - feeType -> YIELD_PERCENTAGE
        // - holderYield + baselineYield <= 9700 -> 8000 + 1000 = 9000
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

        // This will deploy the Fundraise pool, transfer the ERC721, and mint ERC1155 tokens
        pt.mintPrinciple(validInput);

        console.log(
            "Successfully minted Principle Tokens for Token ID:",
            tokenId
        );

        // Validate the asset was correctly pulled from the deployer
        // The new owner should be the deployed fundraise pool, not the deployer
        address newOwner = asset.ownerOf(tokenId);
        assertTrue(
            newOwner != deployer,
            "Deployer should no longer own the asset"
        );

        vm.stopPrank();
    }
}
