// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IPrincipleAsset is IERC721 {
    function mint(address to) external;
}
