// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title SimpleContract
/// @author Your Name
/// @notice An upgradeable contract demonstrating the Diamond Storage Pattern
/// @dev This contract uses library-based storage for upgradeable-safe state management
/// @dev Inherits from Initializable, OwnableUpgradeable, and SimpleContractView
import {Initializable} from "@openzeppelin-upgradeable/contracts/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {SimpleContractView} from "./libraries/SimpleContractView.sol";
import {LibCounterStorage} from "./libraries/CounterStorage.sol";

contract SimpleContract is Initializable, OwnableUpgradeable, SimpleContractView {
    using LibCounterStorage for *;

    /// @notice Initializes the contract with an admin owner
    /// @dev This function replaces the constructor for upgradeable contracts
    /// @dev Can only be called once due to the initializer modifier
    /// @param adminOwner The address that will be set as the owner of the contract
    function initialize(address adminOwner) public initializer {
        __Ownable_init(adminOwner);
    }

    /// @notice Constructor that disables initializers
    /// @dev This prevents the implementation contract from being initialized
    /// @dev Required for upgradeable contracts to prevent initialization attacks
    constructor() {
        _disableInitializers();
    }

    /// @notice Increments the counter for a given ID
    /// @dev Uses the Diamond Storage Pattern to access storage safely
    /// @dev The counter is stored in a library-based storage slot
    /// @param id The unique identifier for the counter to increment
    function increment(uint256 id) public {
        LibCounterStorage.s().idToCounter[id]++;
    }
}
