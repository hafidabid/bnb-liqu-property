// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title Structs
/// @author Azka Willian Muhammad
/// @notice Storage struct definitions for the Diamond Storage Pattern
/// @dev This struct defines the storage layout for upgradeable contracts
/// @dev Used in conjunction with LibCounterStorage for safe storage access

/// @notice Storage struct for counter data
/// @dev This struct is stored at a fixed slot determined by LibCounterStorage
/// @dev Adding new fields should only be done at the end to maintain storage compatibility
struct ModularStorage {
    /// @notice Mapping from ID to counter value
    /// @dev Each ID can have its own independent counter
    mapping(uint256 => uint256) idToCounter;
}

struct PositionStorage {
    mapping(uint256 => Position) idToPosition;
}

struct GuardStorage {
    mapping(address => bool) isManager;
}

enum FeeType {
    YIELD_PERCENTAGE,
    MONTHLY
}

struct Position {
    address owner;
    uint256 tokenId;
    uint256 timestamp;
    uint256 expiry;
    address pool;
    uint256 presaleAmount;
    uint256 totalSupply;
    uint256 presalePrice;
    address guard;
    address yieldToken;
    uint256 holderYieldBPS;
    uint256 baselineYieldBPS;
    uint256 yieldPeriodSeconds;
    uint256 reportPeriodSeconds;
    FeeType feeType;
}

struct GuardInput {
    address yieldToken;
    address settlement;
}

struct PositionInput {
    PrincipleSupply totalSupply;
    uint16 presaleAmount; // IN PERCENTAGE
    uint256 deadline;
    uint256 tokenId;
    uint256 presalePrice;
    uint256 holderYieldBPS;
    uint256 baselineYieldBPS;
    uint256 yieldPeriodSeconds;
    uint256 reportPeriodSeconds;
    FeeType feeType;
}

struct RouterInput {
    address token0;
    bool zeroForOne;
    uint256 amountIn;
    uint256 amountOut;
    uint256 deadline;
}

enum PrincipleSupply {
    NULL,
    FIRST,
    SECOND //100_)00
}
