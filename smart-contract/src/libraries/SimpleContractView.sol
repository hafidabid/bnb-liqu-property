// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title SimpleContractView
/// @author Azka Willian Muhammad
/// @notice Abstract contract providing view functions for SimpleContract
/// @dev Separates view logic from state-changing logic for better organization
/// @dev Inherited by SimpleContract to provide read-only access to counter data
import {LibCounterStorage} from "./CounterStorage.sol";

abstract contract SimpleContractView {
    using LibCounterStorage for *;

    /// @notice Gets the current counter value for a given ID
    /// @dev Reads from the Diamond Storage Pattern storage slot
    /// @param id The unique identifier to query the counter for
    /// @return The current counter value for the given ID
    function getIdToCounted(uint256 id) external view returns (uint256) {
        return LibCounterStorage.s().idToCounter[id];
    }
}
