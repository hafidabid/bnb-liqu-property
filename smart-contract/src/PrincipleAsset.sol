// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";

/// @title PrincipleAsset
/// @notice A non-upgradeable ERC721 contract that represents principle assets
/// @dev Only mints tokens when called by the authorized principle token contract
contract PrincipleAsset is Ownable, ERC721 {
    /// @notice The address of the principle token contract authorized to mint assets
    address public principleToken;

    /// @notice The current token ID counter
    uint256 public tokenId;

    /// @notice Modifier that restricts function access to the principle token contract
    modifier onlyPrinciple() {
        if (msg.sender != principleToken) revert Errors.NotThePrinciple();
        _;
    }

    /// @notice Constructor — sets owner, principleToken, name, and symbol
    /// @param owner The address that will own this contract
    /// @param principleToken_ The address of the principle token contract authorized to mint
    /// @param name_ The name of the ERC721 token
    /// @param symbol_ The symbol of the ERC721 token
    constructor(
        address owner,
        address principleToken_,
        string memory name_,
        string memory symbol_
    ) Ownable(owner) ERC721(name_, symbol_) {
        principleToken = principleToken_;
    }

    /// @notice Updates the principle token address authorized to mint
    /// @dev Only callable by the contract owner; used for post-deploy wiring
    /// @param principleToken_ The new principle token contract address
    function setPrincipleToken(address principleToken_) external onlyOwner {
        principleToken = principleToken_;
    }

    /// @notice Mints a new principle asset token to the specified address
    /// @dev Only callable by the authorized principle token contract
    /// @param to The address that will receive the newly minted token
    function mint(address to) external onlyPrinciple {
        tokenId++;
        _mint(to, tokenId);
    }
}
