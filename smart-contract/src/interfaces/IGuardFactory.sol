// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IGuardFactory {
    function deployGuard(address _yieldToken) external returns (address);
    function deployYieldToken(
        string memory name,
        string memory symbol
    ) external returns (address);
}
