// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";

/// @notice THIS SCRIPT IS DEPRECATED.
/// Contracts are now non-upgradeable. This file is kept as a placeholder
/// to avoid breaking any references. Use DeployPrincipleToken2.s.sol instead.
contract UpgradePrincipleTokenScript is Script {
    function run() external {
        revert(
            "Upgrade not applicable: contracts are non-upgradeable. Use DeployPrincipleToken2.s.sol"
        );
    }
}
