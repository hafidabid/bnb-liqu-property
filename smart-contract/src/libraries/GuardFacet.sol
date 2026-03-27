// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title SimpleContractView
/// @author Azka Willian Muhammad
/// @notice Abstract contract providing view functions for SimpleContract
/// @dev Separates view logic from state-changing logic for better organization
/// @dev Inherited by SimpleContract to provide read-only access to counter data
import {LibGuardFacet} from "./LibGuardFacet.sol";

abstract contract GuardFacet {
    using LibGuardFacet for *;

    function checkManager(address _manager) public view returns (bool) {
        return LibGuardFacet.s().isManager[_manager];
    }
}
