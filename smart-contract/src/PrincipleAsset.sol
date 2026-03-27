// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {
    Initializable
} from "@openzeppelin-upgradeable/contracts/proxy/utils/Initializable.sol";
import {
    OwnableUpgradeable
} from "@openzeppelin-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {
    ERC721Upgradeable
} from "@openzeppelin-upgradeable/contracts/token/ERC721/ERC721Upgradeable.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";
import {console, Test} from "forge-std/Test.sol";

/// @title PrincipleAsset
/// @notice An upgradeable ERC721 contract that represents principle assets
/// @dev This contract can only mint tokens when called by the authorized principle token contract
/// @dev Inherits from Initializable, OwnableUpgradeable, and ERC721Upgradeable for upgradeability and ownership features
contract PrincipleAsset is
    Initializable,
    OwnableUpgradeable,
    ERC721Upgradeable
{
    /// @notice The address of the principle token contract authorized to mint assets
    /// @dev Only this address can call the mint function
    address public principleToken;

    /// @notice The current token ID counter
    /// @dev Increments with each mint operation
    uint256 public tokenId;

    /// @notice Modifier that restricts function access to the principle token contract
    /// @dev Reverts with NotThePrinciple error if caller is not the authorized principle token
    modifier onlyPrinciple() {
        if (msg.sender != principleToken) revert Errors.NotThePrinciple();
        _;
    }

    /// @notice Initializes the contract with owner, principle token, name, and symbol
    /// @dev This function replaces the constructor for upgradeable contracts
    /// @param owner The address that will own this contract
    /// @param principleToken_ The address of the principle token contract authorized to mint
    /// @param name_ The name of the ERC721 token
    /// @param symbol_ The symbol of the ERC721 token
    function initialize(
        address owner,
        address principleToken_,
        string memory name_,
        string memory symbol_
    ) external initializer {
        __Ownable_init(owner);
        __ERC721_init(name_, symbol_);
        principleToken = principleToken_;
    }

    /// @notice Constructor that disables initializers to prevent direct deployment
    /// @dev This ensures the contract can only be used as an implementation for proxy contracts
    constructor() {
        _disableInitializers();
    }

    /// @notice Updates the principle token address authorized to mint
    /// @dev Only callable by the contract owner; used for post-deploy wiring
    /// @param principleToken_ The new principle token contract address
    function setPrincipleToken(address principleToken_) external onlyOwner {
        principleToken = principleToken_;
    }

    /// @notice Mints a new principle asset token to the specified address
    /// @dev Only callable by the authorized principle token contract
    /// @dev Increments the tokenId counter and emits a PrincipleAssetMinted event
    /// @param to The address that will receive the newly minted token
    function mint(address to) external onlyPrinciple {
        tokenId++;
        _mint(to, tokenId);
    }
}
