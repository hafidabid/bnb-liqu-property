// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title LibCounterStorage
/// @author Azka Willian Muhammad
/// @notice Library for accessing counter storage using the Diamond Storage Pattern
/// @dev This library provides a safe way to access storage in upgradeable contracts
/// @dev Uses a unique keccak256 slot to prevent storage collisions
import {PositionStorage} from "./Structs.sol";

library LibPrincipleFacet {
    /// @notice The unique storage slot identifier for counter storage
    /// @dev Calculated using keccak256("counter.storage") to ensure uniqueness
    bytes32 internal constant positionSlot = keccak256("position.storage");

    /// @notice Returns a reference to the ModularStorage struct at a fixed storage slot
    /// @dev Uses assembly to set the storage slot pointer
    /// @dev This pattern ensures storage layout compatibility across upgrades
    /// @return $ A storage reference to the ModularStorage struct
    function s() internal pure returns (PositionStorage storage $) {
        bytes32 slot = positionSlot;
        assembly {
            $.slot := slot
        }
    }
}
