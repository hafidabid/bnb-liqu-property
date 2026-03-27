// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {PrincipleToken} from "../src/PrincipleToken.sol";
import {PrincipleAsset} from "../src/PrincipleAsset.sol";
import {FundraiseFactory} from "../src/modules/FundraiseFactory.sol";
import {GuardFactory} from "../src/modules/GuardFactory.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {PositionInput, Position, PrincipleSupply, FeeType} from "../src/libraries/Structs.sol";
import {Errors} from "../src/libraries/Errors.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IPrincipleAsset} from "../src/interfaces/IPrincipleAsset.sol";
import {INonfungiblePositionManager} from "../src/interfaces/INonfungiblePositionManager.sol";

/// @title PricipleTokenWork1Test
/// @notice Debugging test suite for the registerProperty -> mintPrinciple flow.
///         Each test isolates one specific failure condition so you can identify
///         exactly which check is causing the on-chain revert.
contract PricipleTokenWork1Test is Test, ERC1155Holder {
    // ─── Contracts ────────────────────────────────────────────────────────────
    PrincipleToken public pt;
    PrincipleAsset public assetImpl;
    PrincipleAsset public asset; // proxy
    FundraiseFactory public factory;
    GuardFactory public guardFactory;
    MockUSD public usdc;
    TransparentUpgradeableProxy public proxy;
    IPrincipleAsset public principleAsset;
    INonfungiblePositionManager public positionManager;

    // ─── Actors ───────────────────────────────────────────────────────────────
    address admin = makeAddr("admin");
    address owner = makeAddr("owner"); // property owner / deployer
    address treasury = makeAddr("treasury");
    address buyer = makeAddr("buyer");

    // ─── Pre-computed addresses (needed because PT address is used in deps) ───
    address computePrincipleContract;
    address computeAssetContract;

    // =========================================================================
    // SETUP
    // =========================================================================

    function setUp() public {
        // --- Fork Base Sepolia so real positionManager exists ---
        vm.createSelectFork(vm.envString("BASE_SEPOLIA_RPC_URL"));
        positionManager = INonfungiblePositionManager(vm.envAddress("BASE_SEPOLIA_POSITION_MANAGER"));

        // --- Pre-compute deployment addresses (same trick as PrincipleToken.t.sol) ---
        uint64 nonce = vm.getNonce(address(this));
        // deployment order: usdc(+0), guardFactory(+1), factory(+2), assetImpl(+3), proxy-asset(+4), pt(+5), proxy-pt(+6)
        computePrincipleContract = vm.computeCreateAddress(address(this), nonce + 6);
        computeAssetContract = vm.computeCreateAddress(address(this), nonce + 4);

        usdc = new MockUSD(); // nonce+0

        guardFactory = new GuardFactory( // nonce+1
            computePrincipleContract, address(usdc), address(positionManager)
        );

        factory = new FundraiseFactory( // nonce+2
            computePrincipleContract, address(usdc), computeAssetContract, computePrincipleContract
        );

        assetImpl = new PrincipleAsset(); // nonce+3

        bytes memory assetData = abi.encodeWithSignature(
            "initialize(address,address,string,string)",
            address(this),
            computePrincipleContract,
            "Property Asset",
            "PROP"
        );
        proxy = new TransparentUpgradeableProxy(address(assetImpl), address(this), assetData); // nonce+4
        asset = PrincipleAsset(address(proxy));
        principleAsset = IPrincipleAsset(address(asset));

        PrincipleToken ptImpl = new PrincipleToken( // nonce+5
            address(asset), address(factory), address(usdc), address(guardFactory), address(positionManager)
        );

        bytes memory ptData =
            abi.encodeWithSignature("initialize(address,address,string)", address(this), admin, "ipfs://metadata");

        vm.setNonce(address(this), nonce + 6);
        proxy = new TransparentUpgradeableProxy(address(ptImpl), address(this), ptData); // nonce+6
        pt = PrincipleToken(address(proxy));

        // Sanity: confirm address prediction was correct
        assertEq(address(pt), computePrincipleContract, "PT address mismatch - nonce offset wrong");

        // Give buyer some USDC
        deal(address(usdc), buyer, 10_000_000e6);
    }

    // =========================================================================
    // HELPER: build a default valid PositionInput
    // =========================================================================

    function _defaultInput(uint256 tokenId_) internal view returns (PositionInput memory) {
        return PositionInput({
            totalSupply: PrincipleSupply.SECOND, // 100_000 tokens
            presaleAmount: 2000, // 20% of supply in presale
            deadline: block.timestamp + 7 days,
            tokenId: tokenId_,
            presalePrice: 1_000e6, // 1000 USDC per token
            holderYieldBPS: 7000,
            baselineYieldBPS: 2700,
            yieldPeriodSeconds: 30 days,
            reportPeriodSeconds: 30 days,
            feeType: FeeType.YIELD_PERCENTAGE
        });
    }

    // =========================================================================
    // DEBUG 1 - registerProperty tokenId tracking
    //   Verifies that the tokenId returned by registerProperty matches the
    //   actual NFT tokenId minted to msg.sender by PrincipleAsset.
    //   If these drift (e.g. because mintAsset was called before), mintPrinciple
    //   will revert with UneligibleBalance.
    // =========================================================================

    function test_debug_tokenId_alignment() public {
        vm.startPrank(owner);
        uint256 returnedTokenId = pt.registerProperty("ipfs://property1");

        // PrincipleToken.tokenId counter
        uint256 ptTokenId = pt.tokenId();
        // PrincipleAsset.tokenId counter
        uint256 assetTokenId = asset.tokenId();

        console.log("=== DEBUG: tokenId alignment ===");
        console.log("registerProperty returned tokenId :", returnedTokenId);
        console.log("pt.tokenId()                     :", ptTokenId);
        console.log("asset.tokenId()                  :", assetTokenId);
        console.log("NFT owner of assetTokenId        :", IERC721(address(asset)).ownerOf(assetTokenId));

        assertEq(returnedTokenId, ptTokenId, "BUG: returned tokenId != pt.tokenId()");
        assertEq(returnedTokenId, assetTokenId, "BUG: PrincipleToken and PrincipleAsset tokenId counters drifted");
        assertEq(
            IERC721(address(asset)).ownerOf(assetTokenId),
            owner,
            "BUG: NFT not owned by the caller of registerProperty"
        );

        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 2 - platformTreasury guard
    //   mintPrinciple reverts with TreasuryNotSet if platformTreasury == address(0).
    //   THIS IS VERY LIKELY THE ON-CHAIN FAILURE if you never called setPlatformTreasury.
    // =========================================================================

    function test_debug_treasury_not_set_reverts() public {
        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        PositionInput memory input = _defaultInput(tokenId_);

        // Approve NFT so the transfer check doesn't get in the way
        vm.startPrank(owner);
        principleAsset.approve(address(pt), tokenId_);

        console.log("=== DEBUG: platformTreasury ===");
        console.log("platformTreasury before set :", pt.platformTreasury());

        // Expect the TreasuryNotSet revert **before** trying to set it
        vm.expectRevert(Errors.TreasuryNotSet.selector);
        pt.mintPrinciple(input);

        console.log("CONFIRMED: mintPrinciple reverts with TreasuryNotSet when treasury is zero");
        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 3 - NFT ownership check
    //   mintPrinciple checks ownerOf(input.tokenId) == msg.sender.
    //   If you call it with the wrong tokenId or from the wrong address it reverts
    //   with UneligibleBalance.
    // =========================================================================

    function test_debug_ownership_check() public {
        // Set treasury first so we isolate the ownership check
        pt.setPlatformTreasury(treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        console.log("=== DEBUG: NFT ownership ===");
        console.log("NFT tokenId minted            :", tokenId_);
        console.log("NFT owner                     :", IERC721(address(asset)).ownerOf(tokenId_));

        // Attempt from WRONG caller (buyer doesn't own the NFT)
        PositionInput memory input = _defaultInput(tokenId_);
        vm.expectRevert(Errors.UneligibleBalance.selector);
        vm.prank(buyer);
        pt.mintPrinciple(input);
        console.log("CONFIRMED: calling mintPrinciple from non-NFT-owner reverts with UneligibleBalance");

        // Attempt with WRONG tokenId (999 doesn't exist)
        PositionInput memory badIdInput = _defaultInput(999);
        vm.expectRevert(); // ownerOf reverts for non-existent token
        vm.prank(owner);
        pt.mintPrinciple(badIdInput);
        console.log("CONFIRMED: calling mintPrinciple with wrong tokenId reverts");
    }

    // =========================================================================
    // DEBUG 4 - NFT approval check
    //   principleAsset.safeTransferFrom inside mintPrinciple requires the caller
    //   to have approved the PrincipleToken contract first.
    //   Without approval it reverts with ERC721InsufficientApproval.
    // =========================================================================

    function test_debug_nft_approval_missing_reverts() public {
        pt.setPlatformTreasury(treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        PositionInput memory input = _defaultInput(tokenId_);

        console.log("=== DEBUG: NFT approval ===");
        console.log("NFT approved to (before)      :", IERC721(address(asset)).getApproved(tokenId_));

        // No approve() call - mintPrinciple should fail
        vm.expectRevert(); // ERC721: caller is not token owner nor approved
        vm.prank(owner);
        pt.mintPrinciple(input);
        console.log("CONFIRMED: mintPrinciple reverts when NFT is not approved to PrincipleToken");
    }

    // =========================================================================
    // DEBUG 5 - BPS validation
    //   YIELD_PERCENTAGE: holderYieldBPS + baselineYieldBPS must be <= 9700.
    //   MONTHLY:          holderYieldBPS + baselineYieldBPS must equal 10000.
    // =========================================================================

    function test_debug_bps_validation() public {
        pt.setPlatformTreasury(treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        vm.startPrank(owner);
        principleAsset.approve(address(pt), tokenId_);

        // YIELD_PERCENTAGE with sum > 9700 → should revert
        PositionInput memory badBps = _defaultInput(tokenId_);
        badBps.holderYieldBPS = 9000;
        badBps.baselineYieldBPS = 1000; // 9000 + 1000 = 10000 > 9700

        console.log("=== DEBUG: BPS validation ===");
        console.log("holderYieldBPS  :", badBps.holderYieldBPS);
        console.log("baselineYieldBPS:", badBps.baselineYieldBPS);
        console.log("sum             :", badBps.holderYieldBPS + badBps.baselineYieldBPS);

        vm.expectRevert(Errors.InvalidBPS.selector);
        pt.mintPrinciple(badBps);
        console.log("CONFIRMED: YIELD_PERCENTAGE with sum > 9700 reverts with InvalidBPS");

        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 6 - presaleAmount range
    //   presaleAmount is stored as uint16 IN BPS (0-10000 = 0%-100%).
    //   Values > 10000 revert with InvalidBPS.
    // =========================================================================

    function test_debug_presale_amount_bps_range() public {
        pt.setPlatformTreasury(treasury);

        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");

        vm.startPrank(owner);
        principleAsset.approve(address(pt), tokenId_);

        PositionInput memory input = _defaultInput(tokenId_);
        input.presaleAmount = 10_001; // > 10_000 → invalid

        console.log("=== DEBUG: presaleAmount BPS ===");
        console.log("presaleAmount   :", input.presaleAmount);

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

        console.log("=== DEBUG: NULL supply ===");
        vm.expectRevert(Errors.InvalidPrincipleSupply.selector);
        pt.mintPrinciple(input);
        console.log("CONFIRMED: PrincipleSupply.NULL reverts with InvalidPrincipleSupply");

        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 8 - FULL HAPPY PATH (full flow: registerProperty → mintPrinciple)
    //   This is the integration test showing the correct sequence of calls.
    //   If this passes, the on-chain issue is a configuration/state problem.
    // =========================================================================

    function test_debug_full_happy_path() public {
        console.log("=== DEBUG: full happy path ===");

        // Step 1 - set the treasury (MUST be done before mintPrinciple)
        pt.setPlatformTreasury(treasury);
        console.log("Step 1 OK: platformTreasury set to", treasury);

        // Step 2 - register property (mints ERC-721 to caller)
        vm.prank(owner);
        uint256 tokenId_ = pt.registerProperty("ipfs://property1");
        console.log("Step 2 OK: registerProperty, tokenId =", tokenId_);
        console.log("           NFT owner:", IERC721(address(asset)).ownerOf(tokenId_));

        // Step 3 - approve the PrincipleToken contract to transfer the ERC-721
        vm.prank(owner);
        principleAsset.approve(address(pt), tokenId_);
        console.log("Step 3 OK: NFT approved to PrincipleToken");

        // Step 4 - mintPrinciple with valid inputs
        PositionInput memory input = _defaultInput(tokenId_);
        vm.prank(owner);
        pt.mintPrinciple(input);
        console.log("Step 4 OK: mintPrinciple succeeded");

        // Verify resulting position
        Position memory pos = pt.getIdToPosition(tokenId_);
        console.log("--- Position ---");
        console.log("owner          :", pos.owner);
        console.log("tokenId        :", pos.tokenId);
        console.log("pool           :", pos.pool);
        console.log("totalSupply    :", pos.totalSupply);
        console.log("presaleAmount  :", pos.presaleAmount);
        console.log("presalePrice   :", pos.presalePrice);
        console.log("expiry         :", pos.expiry);

        assertEq(pos.owner, owner, "position owner should be the caller");
        assertEq(pos.tokenId, tokenId_, "position tokenId mismatch");
        assertNotEq(pos.pool, address(0), "pool should be deployed");
        assertEq(pos.totalSupply, 100_000, "totalSupply should be 100_000 (SECOND)");

        // ERC1155 balances
        uint256 platformFee = (100_000 * 50) / 10_000; // 500
        uint256 poolBalance = 100_000 - platformFee; // 99_500
        assertEq(IERC1155(address(pt)).balanceOf(treasury, tokenId_), platformFee, "treasury ERC1155 balance wrong");
        assertEq(IERC1155(address(pt)).balanceOf(pos.pool, tokenId_), poolBalance, "pool ERC1155 balance wrong");
        console.log("platformFee ERC1155 to treasury:", platformFee);
        console.log("ERC1155 to pool                :", poolBalance);
        console.log("=== HAPPY PATH PASSED ===");
    }

    // =========================================================================
    // DEBUG 9 - tokenId drift scenario
    //   Simulates having called mintAsset() before registerProperty(),
    //   which causes the two tokenId counters to drift, making mintPrinciple
    //   fail with UneligibleBalance even though the user holds an NFT.
    // =========================================================================

    function test_debug_tokenId_drift_after_mintAsset() public {
        pt.setPlatformTreasury(treasury);

        // Admin calls mintAsset first (like the original flow on-chain might have done)
        vm.prank(admin);
        pt.mintAsset(owner); // PT tokenId = 1, Asset tokenId = 1

        uint256 ptTokenIdAfterMintAsset = pt.tokenId();
        uint256 assetTokenIdAfterMintAsset = asset.tokenId();
        console.log("=== DEBUG: tokenId drift ===");
        console.log("After mintAsset:");
        console.log("  pt.tokenId()   :", ptTokenIdAfterMintAsset);
        console.log("  asset.tokenId():", assetTokenIdAfterMintAsset);

        // Now owner registerProperty - both counters increment by 1
        vm.prank(owner);
        uint256 returnedId = pt.registerProperty("ipfs://property2");

        uint256 ptTokenIdAfterRegister = pt.tokenId();
        uint256 assetTokenIdAfterRegister = asset.tokenId();
        console.log("After registerProperty:");
        console.log("  registerProperty returned :", returnedId);
        console.log("  pt.tokenId()              :", ptTokenIdAfterRegister);
        console.log("  asset.tokenId()           :", assetTokenIdAfterRegister);

        // The returned tokenId == pt.tokenId == 2
        // The NFT actually minted to owner == asset.tokenId == 2
        // In this case they still align! Document this for clarity.
        assertEq(returnedId, assetTokenIdAfterRegister, "tokenIds should still align after mintAsset + registerProperty");
        console.log("Both counters are in sync - tokenId drift is NOT the issue in this case");

        // Show what happens if you pass the WRONG tokenId (e.g. 1 from mintAsset)
        vm.startPrank(owner);
        principleAsset.approve(address(pt), returnedId);
        PositionInput memory badInput = _defaultInput(1); // tokenId 1 belongs to owner too? No - mintAsset mints to 'owner'
        // owner holds tokenId 1 (from mintAsset) AND tokenId 2 (from registerProperty)
        // but both are held by owner, so let's check if mintPrinciple with tokenId=1 works
        // (it should, as owner holds it, but the returned ID from registerProperty is 2)
        console.log("owner NFT balance:", IERC721(address(asset)).balanceOf(owner));
        vm.stopPrank();
    }

    // =========================================================================
    // DEBUG 10 - FundraiseFactory NotAnOperator guard
    //   Makes sure the factory's operator is set to the PrincipleToken contract.
    //   If the factory was deployed with a wrong operator, mintPrinciple will
    //   revert with NotAnOperator inside factory.deploy().
    // =========================================================================

    function test_debug_factory_operator() public {
        console.log("=== DEBUG: FundraiseFactory operator ===");
        console.log("factory.operator()         :", factory.operator());
        console.log("PrincipleToken address      :", address(pt));
        console.log("computePrincipleContract    :", computePrincipleContract);

        assertEq(
            factory.operator(),
            address(pt),
            "BUG: FundraiseFactory.operator != PrincipleToken address. mintPrinciple will revert with NotAnOperator"
        );
        console.log("CONFIRMED: factory operator matches PrincipleToken address");
    }

    // =========================================================================
    // DEBUG 11 - PrincipleAsset principleToken pointer
    //   PrincipleAsset.mint() is only callable by principleToken.
    //   If the asset was initialized with the wrong principleToken address,
    //   registerProperty (or mintPrinciple indirectly) will fail.
    // =========================================================================

    function test_debug_asset_principleToken_pointer() public {
        console.log("=== DEBUG: PrincipleAsset.principleToken pointer ===");
        console.log("asset.principleToken()     :", asset.principleToken());
        console.log("PrincipleToken address     :", address(pt));

        assertEq(
            asset.principleToken(),
            address(pt),
            "BUG: PrincipleAsset.principleToken != PrincipleToken address. registerProperty will revert"
        );
        console.log("CONFIRMED: asset principleToken pointer is correct");
    }
}
