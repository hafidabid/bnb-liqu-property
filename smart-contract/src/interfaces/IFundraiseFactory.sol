// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IFundraiseFactory {
    function deploy(address owner_, uint256 tokenId) external returns (address);
}
