// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {PrincipleToken} from "../src/PrincipleToken.sol";
import {PrincipleAsset} from "../src/PrincipleAsset.sol";
import {PrincipleRouter} from "../src/modules/PrincipleRouter.sol";
import {YieldToken} from "../src/YieldToken.sol";
import {FundraiseFactory} from "../src/modules/FundraiseFactory.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {GuardFactory} from "../src/modules/GuardFactory.sol";
import {PriceMath} from "../src/libraries/PriceMath.sol";
import {TickMath} from "../src/libraries/TickMath.sol";
import {
    TransparentUpgradeableProxy
} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {
    PositionInput,
    Position,
    PrincipleSupply,
    RouterInput,
    FeeType
} from "../src/libraries/Structs.sol";
import {Errors} from "../src/libraries/Errors.sol";
import {Events} from "../src/libraries/Events.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {
    ERC1155Holder
} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {
    INonfungiblePositionManager
} from "../src/interfaces/INonfungiblePositionManager.sol";
import {IPrincipleAsset} from "../src/interfaces/IPrincipleAsset.sol";

contract PrincipleTokenTest is Test, ERC1155Holder {
    PrincipleToken public pt;
    PrincipleAsset public asset;
    FundraiseFactory public factory;
    MockUSD public usdc;
    TransparentUpgradeableProxy public proxy;
    GuardFactory public guardFactory;
    PrincipleRouter public router;
    IPrincipleAsset public principleAsset;
    INonfungiblePositionManager public immutable positionManager =
        INonfungiblePositionManager(
            vm.envAddress("BASE_SEPOLIA_POSITION_MANAGER")
        );

    address public immutable swapRouter02 =
        0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;
    address admin = makeAddr("admin");
    address james = makeAddr("james");
    address alice = makeAddr("alice");

    address computePrincipleContract;
    address computeAssetContract;

    function setUp() public {
        //create select fork
        vm.createSelectFork(vm.envString("BASE_SEPOLIA_RPC_URL"), 34964820);

        uint64 nonce = vm.getNonce(address(this));
        computePrincipleContract = vm.computeCreateAddress(
            address(this),
            nonce + 6
        );
        computeAssetContract = vm.computeCreateAddress(
            address(this),
            nonce + 4
        );

        usdc = new MockUSD();
        guardFactory = new GuardFactory(
            computePrincipleContract,
            address(usdc),
            address(positionManager)
        );
        factory = new FundraiseFactory(
            computePrincipleContract,
            address(usdc),
            computeAssetContract,
            computePrincipleContract
        );
        //assetNFT deployment
        asset = new PrincipleAsset();

        bytes memory data = abi.encodeWithSignature(
            "initialize(address,address,string,string)",
            address(this),
            computePrincipleContract,
            "Asset Token",
            "AT"
        );

        proxy = new TransparentUpgradeableProxy(
            address(asset),
            address(this),
            data
        );
        asset = PrincipleAsset(address(proxy));
        principleAsset = IPrincipleAsset(address(asset));

        //principle token deployment
        pt = new PrincipleToken(
            address(asset),
            address(factory),
            address(usdc),
            address(guardFactory),
            address(positionManager)
        );

        data = abi.encodeWithSignature(
            "initialize(address,address,string)",
            address(this),
            admin,
            "PrincipleToken",
            "PT"
        );

        vm.setNonce(address(this), nonce + 6);
        proxy = new TransparentUpgradeableProxy(
            address(pt),
            address(this),
            data
        );
        pt = PrincipleToken(address(proxy));

        router = new PrincipleRouter(swapRouter02, address(usdc));
        deal(address(usdc), alice, 100_000_000e6);
    }

    function test_deployment() public view {
        assertEq(address(pt), computePrincipleContract, "should be equal");
    }

    function test_MintAsset_happy() public {
        vm.prank(admin);
        pt.mintAsset(james);

        assertEq(IERC721(address(asset)).balanceOf(james), 1);
    }

    function test_MintPrinciple_happy() public {
        test_MintAsset_happy();
        uint256 tokenId = asset.tokenId();

        pt.setPlatformTreasury(address(this));

        vm.startPrank(james);
        principleAsset.approve(address(pt), tokenId);

        PositionInput memory input = PositionInput({
            totalSupply: PrincipleSupply.SECOND,
            presaleAmount: 2000,
            deadline: block.timestamp + 7 days,
            tokenId: tokenId,
            presalePrice: 1_000e6,
            holderYieldBPS: 7000,
            baselineYieldBPS: 2700,
            yieldPeriodSeconds: 30 days,
            reportPeriodSeconds: 30 days,
            feeType: FeeType.YIELD_PERCENTAGE
        });

        pt.mintPrinciple(input);

        Position memory position = pt.getIdToPosition(1);
        uint256 deadline = position.expiry;
        uint256 totalSupply = position.totalSupply;

        assertEq(deadline, input.deadline, "should be equal");
        assertEq(totalSupply, 100_000, "total supply should be equal");
    }

    function test_BuyPresale_happy() public {
        test_MintPrinciple_happy();

        vm.startPrank(alice);
        IERC20(usdc).approve(address(pt), type(uint128).max);

        uint256 bal = IERC20(usdc).balanceOf(alice);
        pt.buyPresale(1, 2000);

        vm.stopPrank();

        assertEq(
            IERC1155(address(pt)).balanceOf(alice, 1),
            2000,
            "principle token balance should be the same"
        );
        assertLt(
            IERC20(usdc).balanceOf(alice),
            bal,
            "usdc balance should lower"
        );
    }

    function test_BuyPresale_more_than_supply_unhappy() public {
        test_MintPrinciple_happy();

        vm.startPrank(alice);
        IERC20(usdc).approve(address(pt), type(uint128).max);

        vm.expectRevert(Errors.NotEnoughSupply.selector);
        pt.buyPresale(1, 21_000);

        console.log(
            "Alice NFT balance : ",
            IERC1155(address(pt)).balanceOf(alice, 1)
        );
    }

    function test_DeployGuard_happy() public {
        uint160 sqrtPrice = PriceMath.priceToSqrtPriceX96(1e6, 18);
        uint160 floorSqrtPrice = PriceMath.priceToSqrtPriceX96(0.9e6, 18);
        int24 unnormalizedFloorTick = TickMath.getTickAtSqrtRatio(
            floorSqrtPrice
        );
        int24 floorTick = (unnormalizedFloorTick / 60) * 60;

        test_BuyPresale_happy();
        vm.warp(block.timestamp + 8 days);

        pt.deployGuard("Test Token", "TEST", 1, sqrtPrice, floorTick);
    }

    function test_swap_buy_happy() public {
        test_DeployGuard_happy();
        Position memory position = pt.getIdToPosition(1);

        RouterInput memory input = RouterInput({
            token0: position.yieldToken,
            zeroForOne: false,
            amountIn: 10e6,
            amountOut: 0,
            deadline: block.timestamp
        });

        vm.startPrank(alice);

        IERC20(usdc).approve(address(router), type(uint128).max);
        router.swap(input);

        vm.stopPrank();
    }

    function test_sellNFT_happy() public {
        test_DeployGuard_happy();

        uint256 bal = IERC20(usdc).balanceOf(alice);
        uint256 ptBal = IERC1155(computePrincipleContract).balanceOf(alice, 1);
        vm.startPrank(alice);
        IERC1155(computePrincipleContract).setApprovalForAll(address(pt), true);
        pt.sellPrinciple(1, 1);

        vm.stopPrank();

        assertGt(
            IERC20(usdc).balanceOf(alice),
            bal,
            "balance should be greater"
        );
        assertLt(
            IERC1155(computePrincipleContract).balanceOf(alice, 1),
            ptBal,
            "Principle Amount Should be Greater"
        );

        console.log("principle token balance before : ", ptBal);
        console.log(
            "principle token balance after : ",
            IERC1155(computePrincipleContract).balanceOf(alice, 1)
        );
        console.log("========= LOGS ===========");
        console.log("usdc balance before : ", bal);
        console.log("usdc balance after : ", IERC20(usdc).balanceOf(alice));
    }
}

contract ForkTest is Test {
    address admin = vm.envAddress("CHAINLINK_DEPLOYER_ADDRESS");
    PrincipleToken public pt = PrincipleToken(vm.envAddress("CH_PT"));

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_SEPOLIA_RPC_URL"));
    }

    function test_mintAsset() public {
        vm.prank(admin);
    }

    function test_deployGuard_fork() public {
        string memory name_ = "Test Guard";
        string memory symbol = "TEST";
        uint256 tokenId = 14;
        uint160 sqrtPrice = PriceMath.priceToSqrtPriceX96(1e6, 18);
        uint160 floorSqrtPrice = PriceMath.priceToSqrtPriceX96(0.9e6, 18);
        int24 unnormalizedFloorTick = TickMath.getTickAtSqrtRatio(
            floorSqrtPrice
        );
        int24 floorTick = (unnormalizedFloorTick / 60) * 60;

        console.log("sqrt price : ", sqrtPrice);
        //79228162514264337593543950336
        //79228162514264337593543
        //79228162514264337593543n
        console.log("floorTick", floorTick);

        pt.deployGuard(name_, symbol, tokenId, sqrtPrice, floorTick);
    }
}
