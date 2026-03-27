// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title SimpleContractView
/// @author Azka Willian Muhammad
/// @notice Abstract contract providing view functions for SimpleContract
/// @dev Separates view logic from state-changing logic for better organization
/// @dev Inherited by SimpleContract to provide read-only access to counter data
import {LibPrincipleFacet} from "./LibPrincipleFacet.sol";
import {Position} from "./Structs.sol";

abstract contract PrincipleFacet {
    using LibPrincipleFacet for *;

    /// @notice Gets the current counter value for a given ID
    /// @dev Reads from the Diamond Storage Pattern storage slot
    /// @param id The unique identifier to query the counter for
    /// @return The current counter value for the given ID
    function getIdToPosition(uint256 id) external view returns (Position memory) {
        return LibPrincipleFacet.s().idToPosition[id];
    }
}
