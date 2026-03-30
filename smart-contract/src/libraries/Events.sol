// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title Events
/// @author Azka Willian Muhamamd
/// @notice Event definitions for the contract
/// @dev Events can be added here for off-chain indexing and monitoring

library Events {
    // Events can be added here as needed
    // Example:
    // event CounterIncremented(uint256 indexed id, uint256 newValue);
    event SupplySet(uint256 amount);
    event PresaleBought(uint256 tokenId, uint256 amount, address sender);
    event PrincipleAssetMinted(address to, uint256 tokenId);
    event PostionRegistered(
        address sender,
        uint256 tokenId,
        uint256 deadline,
        address pool,
        uint256 presaleAmount,
        uint256 mintAmount
    );
    event GuardVaultIsSet(address pre, address current);
    event PrincipleGuardDeployed(
        address guard,
        address yield,
        int24 floorTick,
        uint256 bal
    );
    event ManagerUpdated(address _manager);
    //guard event
    event MintBase(
        uint256 anchorTokenId,
        int24 anchorTickLower,
        int24 anchorTickUpper
    );
    event MintAscent(
        uint256 ascentTokenId,
        int24 ascentTickLower,
        int24 ascentTickUpper
    );
    event MintFloor(
        uint256 floorTokenId,
        int24 floorTickLower,
        int24 floorTickUpper
    );

    // --- WRAP / UNWRAP ---
    event Wrapped(
        uint256 indexed tokenId,
        address indexed user,
        uint256 amount
    );
    event Unwrapped(
        uint256 indexed tokenId,
        address indexed user,
        uint256 amount
    );

    // seamless minting events
    event PropertyRegistered(
        address indexed owner,
        uint256 indexed tokenId,
        string metadataURI
    );
    event PlatformFeeMinted(
        address indexed treasury,
        uint256 indexed tokenId,
        uint256 amount
    );
    event YieldDistributed(
        uint256 indexed tokenId,
        uint256 holderShare,
        uint256 baselineShare,
        uint256 platformShare,
        uint256 timestamp
    );
    event ReportAcknowledged(uint256 indexed tokenId, uint256 timestamp);
}
