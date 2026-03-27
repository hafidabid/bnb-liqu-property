// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {INonfungiblePositionManager} from "./interfaces/INonfungiblePositionManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {YieldToken} from "./YieldToken.sol";
import {GuardFacet} from "./libraries/GuardFacet.sol";
import {LibGuardFacet} from "./libraries/LibGuardFacet.sol";
import {TickMath} from "./libraries/TickMath.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";

contract PrincipleGuard is GuardFacet {
    using SafeERC20 for IERC20;
    using LibGuardFacet for *;

    error NotEnoughPriceChange(int24 currentTick, int24 triggerTick);
    error BaseAndAscentOverlap(int24 anchorTickUpper, int24 ascentTickLower);
    // uniswap v3

    INonfungiblePositionManager public immutable nonfungiblePositionManager;

    // positions
    int24 public immutable BASE_LEFT_LENGTH;
    int24 public immutable BASE_RIGHT_LENGTH;
    int24 public immutable ASCENT_LENGTH;
    uint256 public immutable ASCENT_TOKEN_PER_TICK;

    // position configs
    int24 public snapshotMarketTick;
    uint256 public floorTokenId;
    uint256 public initialFloorAmount;
    int24 public floorTickLower;
    int24 public floorTickUpper;

    uint256 public baseTokenId;
    int24 public baseTickLower;
    int24 public baseTickUpper;
    int24 public immutable BASE_TRIGGERED_TICK_LENGTH;

    uint256 public ascentTokenId;
    int24 public ascentTickLower;
    int24 public ascentTickUpper;
    int24 public immutable ASCENT_TRIGGERED_TICK_LENGTH;

    // strategy
    uint256 public lastDropTimestamp;
    int24 public immutable DROP_TRIGGERED_TICK_LENGTH;

    // pool configs
    address public pool;
    address public immutable token0;
    address public immutable token1;
    uint24 public immutable UNISWAP_FEE_TIER;
    int24 public immutable TICK_SPACING;

    IERC20 public immutable yieldToken;

    modifier onlyManager() {
        if (LibGuardFacet.s().isManager[msg.sender] == false) revert Errors.NotAManager();
        _;
    }

    constructor(address _yieldToken, address _token1, address _nonfungiblePositionManager) {
        token0 = _yieldToken;
        token1 = _token1;
        yieldToken = IERC20(_yieldToken);
        nonfungiblePositionManager = INonfungiblePositionManager(_nonfungiblePositionManager); // 0xC36442b4a4522E871399CD717aBDD847Ab11FE88

        //TODO: make it constructor
        BASE_LEFT_LENGTH = 20;
        BASE_RIGHT_LENGTH = 20;
        ASCENT_LENGTH = 20;
        UNISWAP_FEE_TIER = 3000;
        TICK_SPACING = 60;
        ASCENT_TOKEN_PER_TICK = 100e18;

        ASCENT_TRIGGERED_TICK_LENGTH = 240; // 2,4%
        BASE_TRIGGERED_TICK_LENGTH = 200; // 2%
        DROP_TRIGGERED_TICK_LENGTH = 2000; // 20%
    }

    function initPoolAndPosition(uint160 sqrtPriceX96, int24 floorTick, uint256 floorAmount, uint256 baseAmount)
        external
    {
        // [1] create and init pool
        pool = nonfungiblePositionManager.createAndInitializePoolIfNecessary(
            token0, token1, UNISWAP_FEE_TIER, sqrtPriceX96
        );

        // [2] mint floor
        _mintFloor(floorAmount, floorTick);

        // [3] mint anchor and ascent
        _mintBaseAndAscent(baseAmount);

        // [4] zero approve
        IERC20(token0).approve(address(nonfungiblePositionManager), 0);
        IERC20(token1).approve(address(nonfungiblePositionManager), 0);
    }

    function traverse() external {
        (, int24 currentTick,,,,,) = IUniswapV3Pool(pool).slot0();
        int24 triggerTick = ascentTickLower + ASCENT_TRIGGERED_TICK_LENGTH;

        if (currentTick < triggerTick) revert NotEnoughPriceChange(currentTick, triggerTick);

        // [1] Anchor and Ascent : collect fee as surplus
        (, uint256 collectedAmount1Base) = _collect(baseTokenId);
        (, uint256 collectedAmount1Ascent) = _collect(ascentTokenId);

        // [2] Anchor : empty liquidity
        (, uint256 liquidityAmount1Base) = _emptyLiquidity(baseTokenId);

        // [3] Anchor : calculate surplus
        // can't further more than ascentTickUpper
        if (currentTick > ascentTickUpper) currentTick = ascentTickUpper;
        uint24 furtherTick = uint24(currentTick) - uint24(ascentTickLower); // skipped tick from ascentTickLower
        uint24 baseTickLength = uint24(baseTickUpper - baseTickLower);
        uint256 baseLiquiditySurplus = liquidityAmount1Base * uint256(uint24(furtherTick)) / baseTickLength;

        // [4] Increase Floor liquidity with surplus
        uint256 totalSurplus = collectedAmount1Base + collectedAmount1Ascent + baseLiquiditySurplus;
        _increaseLiquidity(floorTokenId, 0, totalSurplus);

        // [5] Ascent : empty liquidity
        _emptyLiquidity(ascentTokenId);

        // [6] mint Anchor and Ascent
        uint256 token1Balance = IERC20(token1).balanceOf(address(this));
        _mintBaseAndAscent(token1Balance);

        // [7make zero approve
        IERC20(token0).approve(address(nonfungiblePositionManager), 0);
        IERC20(token1).approve(address(nonfungiblePositionManager), 0);
    }

    function drift() external {
        (, int24 currentTick,,,,,) = IUniswapV3Pool(pool).slot0();
        int24 triggerTick = snapshotMarketTick - BASE_TRIGGERED_TICK_LENGTH;
        if (currentTick >= triggerTick) revert NotEnoughPriceChange(currentTick, triggerTick);

        // [1] Base : empty liquidity
        _emptyLiquidity(baseTokenId);

        // [2] Base : calculate surplus
        uint256 token1Balance = IERC20(token1).balanceOf(address(this));
        _mintBase(token1Balance);

        // [3] make zero approve
        IERC20(token0).approve(address(nonfungiblePositionManager), 0);
        IERC20(token1).approve(address(nonfungiblePositionManager), 0);
    }

    function decreaseLiquidityFromManager(uint256 tokenId, uint128 liquidity)
        external
        onlyManager
        returns (uint256 amount0, uint256 amount1)
    {
        (amount0, amount1) = nonfungiblePositionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );

        (amount0, amount1) = nonfungiblePositionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }

    function setManager(address _manager) external {
        LibGuardFacet.s().isManager[_manager] = true;

        emit Events.ManagerUpdated(_manager);
    }

    function addToFloor(uint256 usdcAmount) external onlyManager {
        _increaseLiquidity(floorTokenId, 0, usdcAmount);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                     Read Functions                                        //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function getCurrentTick() public view returns (int24) {
        (, int24 currentTick,,,,,) = IUniswapV3Pool(pool).slot0();
        return currentTick;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                   Internal Functions                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function _mintBaseAndAscent(uint256 baseAmount) internal {
        _mintBase(baseAmount);
        _mintAscent();
    }

    function _mintFloor(uint256 floorAmount, int24 floorTick) internal {
        floorTickLower = floorTick;
        floorTickUpper = floorTick + int24(TICK_SPACING);

        // floor position
        INonfungiblePositionManager.MintParams memory floorMintParams = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: UNISWAP_FEE_TIER,
            tickLower: floorTickLower,
            tickUpper: floorTickUpper,
            amount0Desired: 0,
            amount1Desired: floorAmount,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this),
            deadline: block.timestamp
        });

        initialFloorAmount = floorAmount;
        IERC20(token1).approve(address(nonfungiblePositionManager), floorAmount);
        (floorTokenId,,,) = nonfungiblePositionManager.mint(floorMintParams);

        emit Events.MintFloor(floorTokenId, floorTickLower, floorTickUpper);
    }

    function _mintBase(uint256 baseAmount) internal {
        // max mint
        uint256 maxMint = type(uint128).max - IERC20(token0).totalSupply();
        YieldToken(token0).mint(address(this), maxMint);

        (, int24 currentTick,,,,,) = IUniswapV3Pool(pool).slot0();

        // take snapshot of current tick
        snapshotMarketTick = currentTick;

        int24 liquidityTick = (currentTick / TICK_SPACING) * TICK_SPACING;
        baseTickLower = liquidityTick - (BASE_LEFT_LENGTH * TICK_SPACING);
        baseTickUpper = liquidityTick + (BASE_RIGHT_LENGTH * TICK_SPACING);

        INonfungiblePositionManager.MintParams memory mintBaseParams = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: UNISWAP_FEE_TIER,
            tickLower: baseTickLower,
            tickUpper: baseTickUpper,
            amount0Desired: IERC20(token0).balanceOf(address(this)),
            amount1Desired: baseAmount,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this),
            deadline: block.timestamp
        });

        IERC20(token0).approve(address(nonfungiblePositionManager), IERC20(token0).balanceOf(address(this)));
        IERC20(token1).approve(address(nonfungiblePositionManager), baseAmount);
        (baseTokenId,,,) = nonfungiblePositionManager.mint(mintBaseParams);

        YieldToken(token0).burn(IERC20(yieldToken).balanceOf(address(this)));

        emit Events.MintBase(baseTokenId, baseTickLower, baseTickUpper);
    }

    function _mintAscent() internal {
        ascentTickLower = baseTickUpper;
        ascentTickUpper = ascentTickLower + (ASCENT_LENGTH * TICK_SPACING);

        uint256 ascentAmount = uint256(uint24(ASCENT_LENGTH)) * ASCENT_TOKEN_PER_TICK;
        uint256 mustMintedAmount = ascentAmount - IERC20(token0).balanceOf(address(this));

        INonfungiblePositionManager.MintParams memory mintAscentParams = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: UNISWAP_FEE_TIER,
            tickLower: ascentTickLower,
            tickUpper: ascentTickUpper,
            amount0Desired: ascentAmount,
            amount1Desired: 0,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this),
            deadline: block.timestamp
        });

        YieldToken(token0).mint(address(this), mustMintedAmount);
        IERC20(token0).approve(address(nonfungiblePositionManager), ascentAmount);
        (ascentTokenId,,,) = nonfungiblePositionManager.mint(mintAscentParams);
        YieldToken(token0).burn(IERC20(yieldToken).balanceOf(address(this)));

        emit Events.MintAscent(ascentTokenId, ascentTickLower, ascentTickUpper);
    }

    function _emptyLiquidity(uint256 tokenId) internal returns (uint256 amount0, uint256 amount1) {
        (,,,,,,, uint128 liquidity,,,,) = nonfungiblePositionManager.positions(tokenId);
        (amount0, amount1) = _decreaseLiquidity(tokenId, liquidity);
        _collect(tokenId);
        // burn position
        nonfungiblePositionManager.burn(tokenId);
    }

    function _increaseLiquidity(uint256 tokenId, uint256 amount0Desired, uint256 amount1Desired) internal {
        IERC20(token1).approve(address(nonfungiblePositionManager), amount0Desired);
        IERC20(token1).approve(address(nonfungiblePositionManager), amount1Desired);
        nonfungiblePositionManager.increaseLiquidity(
            INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: tokenId,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
    }

    function _decreaseLiquidity(uint256 tokenId, uint128 liquidity)
        internal
        returns (uint256 amount0, uint256 amount1)
    {
        (amount0, amount1) = nonfungiblePositionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
    }

    function _collect(uint256 tokenId) internal returns (uint256 amount0, uint256 amount1) {
        (amount0, amount1) = nonfungiblePositionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }
}
