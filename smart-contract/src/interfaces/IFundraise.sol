// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IFundraise {
    function transferPrincipleToken(address to, uint256 amount) external;
    function transferSettlement(address to, uint256 amount) external;
    function transferPrincipleAsset(address to) external;
}
