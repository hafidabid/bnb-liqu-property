// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IPrincipleGuard {
    function initPoolAndPosition(uint160 sqrtPriceX96, int24 floorTick, uint256 floorAmount, uint256 anchorAmount)
        external;
    function traverse() external;
    function drift() external;
    function decreaseLiquidityFromManager(uint256 tokenId, uint128 liquidity)
        external
        returns (uint256 amount0, uint256 amount1);
    function baseTokenId() external view returns (uint256);
    function floorTokenId() external view returns (uint256);
    function setManager(address _manager) external;
    function addToFloor(uint256 usdcAmount) external;
}
