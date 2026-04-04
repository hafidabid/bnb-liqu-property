// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {PrincipleToken} from "../src/PrincipleToken.sol";
import {PrincipleAsset} from "../src/PrincipleAsset.sol";
import {FundraiseFactory} from "../src/modules/FundraiseFactory.sol";
import {GuardFactory} from "../src/modules/GuardFactory.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {
    PositionInput,
    Position,
    PrincipleSupply,
    FeeType
} from "../src/libraries/Structs.sol";
import {Errors} from "../src/libraries/Errors.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {
    ERC1155Holder
} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IPrincipleAsset} from "../src/interfaces/IPrincipleAsset.sol";
import {
    INonfungiblePositionManager
} from "../src/interfaces/INonfungiblePositionManager.sol";

/// @title PricipleTokenWork1Test
/// @notice Debugging test suite for the registerProperty -> mintPrinciple flow.
///         Updated for non-upgradeable contracts — no proxy/nonce tricks needed.
contract PricipleTokenWork1Test is Test, ERC1155Holder {
    // ─── Contracts ────────────────────────────────────────────────────────────
    PrincipleToken public pt;
    PrincipleAsset public asset;
    FundraiseFactory public factory;
    GuardFactory public guardFactory;
    MockUSD public usdc;
    IPrincipleAsset public principleAsset;
    INonfungiblePositionManager public positionManager;

    // ─── Actors ───────────────────────────────────────────────────────────────
    address admin = makeAddr("admin");
    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address buyer = makeAddr("buyer");

    // =========================================================================
    // SETUP
    // =========================================================================

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_SEPOLIA_RPC_URL"));
        positionManager = INonfungiblePositionManager(
            vm.envAddress("BASE_SEPOLIA_POSITION_MANAGER")
        );

        usdc = new MockUSD();

        // Deploy with placeholder operator/principleToken (wired below)
        asset = new PrincipleAsset(
            address(this),
            address(0),
            "Property Asset",
            "PROP"
        );
        principleAsset = IPrincipleAsset(address(asset));

        guardFactory = new GuardFactory(
            address(0),
            address(usdc),
            address(positionManager)
        );
        factory = new FundraiseFactory(
            address(0),
            address(usdc),
            address(asset),
            address(0)
        );

        // Deploy PrincipleToken — all addresses known
        pt = new PrincipleToken(
            address(this), // adminOwner
            admin, // admin
            "ipfs://metadata",
            address(asset),
            address(factory),
            address(usdc),
            address(guardFactory),
            address(positionManager)
        );

        // Wire everything
        asset.setPrincipleToken(address(pt));
        guardFactory.setOperator(address(pt));
        factory.setOperator(address(pt));

        deal(address(usdc), buyer, 10_000_000e6);
    }

    // =========================================================================
    // HELPER: build a default valid PositionInput
    // =========================================================================

    function _defaultInput(
        uint256 tokenId_
    ) internal view returns (PositionInput memory) {
        return
            PositionInput({
                totalSupply: PrincipleSupply.SECOND,
                presaleAmount: 2000,
                deadline: block.timestamp + 7 days,
                tokenId: tokenId_,
                presalePrice: 1_000e6,
                holderYieldBPS: 7000,
                baselineYieldBPS: 2700,
                yieldPeriodSeconds: 30 days,
                reportPeriodSeconds: 30 days,
                feeType: FeeType.YIELD_PERCENTAGE
            });
    }

    // =========================================================================
    // DEBUG 1 - registerProperty tokenId tracking
    // =========================================================================

    function test_debug_tokenId_alignment() public {
        vm.startPrank(owner);
        uint256 returnedTokenId = pt.registerProperty("ipfs://property1");

        uint256 ptTokenId = pt.tokenId();
        uint256 assetTokenId = asset.tokenId();

        console.log("=== DEBUG: tokenId alignment ===");
        console.log("registerProperty returned tokenId :", returnedTokenId);
        console.log("pt.tokenId()                     :", ptTokenId);
        console.log("asset.tokenId()                  :", assetTokenId);
        console.log(
            "NFT owner of assetTokenId        :",
            IERC721(address(asset)).ownerOf(assetTokenId)
        );

        assertEq(
            returnedTokenId,
            ptTokenId,
            "BUG: returned tokenId != pt.tokenId()"
        );
        assertEq(
            returnedTokenId,
            assetTokenId,
            "BUG: PrincipleToken and PrincipleAsset tokenId counters drifted"
        );
        assertEq(
            IERC721(address(asset)).ownerOf(assetTokenId),
            owner,
            "BUG: NFT not owned by the caller of registerProperty"
        );

        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 2 - platformTreasury guard
    // =========================================================================

    function test_debug_treasury_not_set_reverts() public {
        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        PositionInput memory input = _defaultInput(tokenId_);

        vm.startPrank(owner);
        principleAsset.approve(address(pt), tokenId_);

        console.log("=== DEBUG: platformTreasury ===");
        console.log("platformTreasury before set :", pt.platformTreasury());

        vm.expectRevert(Errors.TreasuryNotSet.selector);
        pt.mintPrinciple(input);

        console.log(
            "CONFIRMED: mintPrinciple reverts with TreasuryNotSet when treasury is zero"
        );
        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 3 - NFT ownership check
    // =========================================================================

    function test_debug_ownership_check() public {
        pt.setPlatformTreasury(treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        console.log("=== DEBUG: NFT ownership ===");
        console.log("NFT tokenId minted            :", tokenId_);
        console.log(
            "NFT owner                     :",
            IERC721(address(asset)).ownerOf(tokenId_)
        );

        PositionInput memory input = _defaultInput(tokenId_);
        vm.expectRevert(Errors.UneligibleBalance.selector);
        vm.prank(buyer);
        pt.mintPrinciple(input);
        console.log(
            "CONFIRMED: calling mintPrinciple from non-NFT-owner reverts with UneligibleBalance"
        );

        PositionInput memory badIdInput = _defaultInput(999);
        vm.expectRevert();
        vm.prank(owner);
        pt.mintPrinciple(badIdInput);
        console.log(
            "CONFIRMED: calling mintPrinciple with wrong tokenId reverts"
        );
    }

    // =========================================================================
    // DEBUG 4 - NFT approval check
    // =========================================================================

    function test_debug_nft_approval_missing_reverts() public {
        pt.setPlatformTreasury(treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        PositionInput memory input = _defaultInput(tokenId_);

        console.log("=== DEBUG: NFT approval ===");
        console.log(
            "NFT approved to (before)      :",
            IERC721(address(asset)).getApproved(tokenId_)
        );

        vm.expectRevert();
        vm.prank(owner);
        pt.mintPrinciple(input);
        console.log(
            "CONFIRMED: mintPrinciple reverts when NFT is not approved to PrincipleToken"
        );
    }

    // =========================================================================
    // DEBUG 5 - BPS validation
    // =========================================================================

    function test_debug_bps_validation() public {
        pt.setPlatformTreasury(treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        vm.startPrank(owner);
        principleAsset.approve(address(pt), tokenId_);

        PositionInput memory badBps = _defaultInput(tokenId_);
        badBps.holderYieldBPS = 9000;
        badBps.baselineYieldBPS = 1000;

        console.log("=== DEBUG: BPS validation ===");
        vm.expectRevert(Errors.InvalidBPS.selector);
        pt.mintPrinciple(badBps);
        console.log(
            "CONFIRMED: YIELD_PERCENTAGE with sum > 9700 reverts with InvalidBPS"
        );
        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 6 - presaleAmount range
    // =========================================================================

    function test_debug_presale_amount_bps_range() public {
        pt.setPlatformTreasury(treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        vm.startPrank(owner);
        principleAsset.approve(address(pt), tokenId_);

        PositionInput memory input = _defaultInput(tokenId_);
        input.presaleAmount = 10_001;

        vm.expectRevert(Errors.InvalidBPS.selector);
        pt.mintPrinciple(input);
        console.log("CONFIRMED: presaleAmount > 10000 reverts with InvalidBPS");
        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 7 - PrincipleSupply.NULL check
    // =========================================================================

    function test_debug_null_supply_reverts() public {
        pt.setPlatformTreasury(treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        vm.startPrank(owner);
        principleAsset.approve(address(pt), tokenId_);

        PositionInput memory input = _defaultInput(tokenId_);
        input.totalSupply = PrincipleSupply.NULL;

        vm.expectRevert(Errors.InvalidPrincipleSupply.selector);
        pt.mintPrinciple(input);
        console.log(
            "CONFIRMED: PrincipleSupply.NULL reverts with InvalidPrincipleSupply"
        );
        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 8 - FULL HAPPY PATH
    // =========================================================================

    function test_debug_full_happy_path() public {
        console.log("=== DEBUG: full happy path ===");

        pt.setPlatformTreasury(treasury);
        console.log("Step 1 OK: platformTreasury set to", treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");
        console.log("Step 2 OK: registerProperty, tokenId =", tokenId_);

        vm.prank(owner);
        principleAsset.approve(address(pt), tokenId_);
        console.log("Step 3 OK: NFT approved to PrincipleToken");

        PositionInput memory input = _defaultInput(tokenId_);
        vm.prank(owner);
        pt.mintPrinciple(input);
        console.log("Step 4 OK: mintPrinciple succeeded");

        Position memory pos = pt.getIdToPosition(tokenId_);
        assertEq(pos.owner, owner, "position owner should be the caller");
        assertEq(pos.tokenId, tokenId_, "position tokenId mismatch");
        assertNotEq(pos.pool, address(0), "pool should be deployed");
        assertEq(
            pos.totalSupply,
            100_000,
            "totalSupply should be 100_000 (SECOND)"
        );

        uint256 platformFee = (100_000 * 50) / 10_000;
        uint256 poolBalance = 100_000 - platformFee;
        assertEq(
            IERC1155(address(pt)).balanceOf(treasury, tokenId_),
            platformFee,
            "treasury ERC1155 balance wrong"
        );
        assertEq(
            IERC1155(address(pt)).balanceOf(pos.pool, tokenId_),
            poolBalance,
            "pool ERC1155 balance wrong"
        );
        console.log("=== HAPPY PATH PASSED ===");
    }

    // =========================================================================
    // DEBUG 9 - tokenId drift scenario
    // =========================================================================

    function test_debug_tokenId_drift_after_mintAsset() public {
        pt.setPlatformTreasury(treasury);

        vm.prank(admin);
        pt.mintAsset(owner);

        console.log("=== DEBUG: tokenId drift ===");
        console.log("After mintAsset:");
        console.log("  pt.tokenId()   :", pt.tokenId());
        console.log("  asset.tokenId():", asset.tokenId());

        vm.prank(owner);
        uint256 returnedId = pt.registerProperty("ipfs://property2");

        console.log("After registerProperty:");
        console.log("  registerProperty returned :", returnedId);
        console.log("  pt.tokenId()              :", pt.tokenId());
        console.log("  asset.tokenId()           :", asset.tokenId());

        assertEq(
            returnedId,
            asset.tokenId(),
            "tokenIds should still align after mintAsset + registerProperty"
        );
        console.log("Both counters are in sync");
    }

    // =========================================================================
    // DEBUG 10 - FundraiseFactory operator check
    // =========================================================================

    function test_debug_factory_operator() public {
        console.log("=== DEBUG: FundraiseFactory operator ===");
        console.log("factory.operator()         :", factory.operator());
        console.log("PrincipleToken address      :", address(pt));

        assertEq(
            factory.operator(),
            address(pt),
            "BUG: FundraiseFactory.operator != PrincipleToken address"
        );
        console.log(
            "CONFIRMED: factory operator matches PrincipleToken address"
        );
    }

    // =========================================================================
    // DEBUG 11 - PrincipleAsset principleToken pointer
    // =========================================================================

    function test_debug_asset_principleToken_pointer() public {
        console.log("=== DEBUG: PrincipleAsset.principleToken pointer ===");
        console.log("asset.principleToken()     :", asset.principleToken());
        console.log("PrincipleToken address     :", address(pt));

        assertEq(
            asset.principleToken(),
            address(pt),
            "BUG: PrincipleAsset.principleToken != PrincipleToken address"
        );
        console.log("CONFIRMED: asset principleToken pointer is correct");
    }
}
