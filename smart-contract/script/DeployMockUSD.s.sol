// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";

/// @notice Deploys MockUSD via CREATE2, mining a salt until the resulting
///         address starts with 0x5 or higher (first nibble >= 5).
contract DeployMockUSD is Script {
    // Foundry's default CREATE2 factory (used when `new Foo{salt: s}()` is called in a broadcast)
    // address constant CREATE2_FACTORY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        bytes32 initCodeHash = keccak256(type(MockUSD).creationCode);

        // Mine a salt whose CREATE2 address starts with 0x5 or higher
        bytes32 salt;
        address predicted;
        uint256 nonce = 0;

        while (true) {
            salt = bytes32(nonce);
            predicted = vm.computeCreate2Address(
                salt,
                initCodeHash,
                CREATE2_FACTORY
            );
            // Check: most-significant nibble of the 20-byte address >= 5
            // i.e. the address as uint160 >= 0x5000...000
            if (
                uint160(predicted) >=
                uint160(0x5000000000000000000000000000000000000000)
            ) {
                break;
            }
            nonce++;
        }

        console.log("Found salt after", nonce, "iterations");
        console.log("Salt (uint256):", nonce);
        console.log("Predicted MockUSD address:", predicted);

        vm.startBroadcast(deployerPrivateKey);

        MockUSD mockUSD = new MockUSD{salt: salt}();
        require(address(mockUSD) == predicted, "Address mismatch");

        console.log("MockUSD deployed at:", address(mockUSD));

        vm.stopBroadcast();
    }
}
