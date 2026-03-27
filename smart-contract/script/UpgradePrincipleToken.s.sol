// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/PrincipleToken.sol";

// Interfaces to handle both OZ v4 and v5 proxy structures if needed
interface IProxyAdmin {
    function upgradeAndCall(
        address proxy,
        address implementation,
        bytes memory data
    ) external payable;
}

interface ITransparentUpgradeableProxy {
    function upgradeTo(address newImplementation) external;
}

// To run this script:
// forge script script/UpgradePrincipleToken.s.sol:UpgradePrincipleTokenScript --rpc-url <YOUR_RPC_URL> --private-key <YOUR_PRIVATE_KEY> --broadcast

contract UpgradePrincipleTokenScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // --- REPLACE PROXY ADDRESS HERE ---
        // This is the address of the existing PrincipleToken proxy contract
        address proxyAddress = 0x0000000000000000000000000000000000000000;

        // --- REPLACE PROXY ADMIN ADDRESS HERE (If using OpenZeppelin v5) ---
        // If left as zero address, it tries to upgrade directly via the proxy (OZ v4)
        address proxyAdminAddress = 0x0000000000000000000000000000000000000000;

        vm.startBroadcast(deployerPrivateKey);

        PrincipleToken oldPt = PrincipleToken(proxyAddress);

        // 1. Deploy the new implementation contract
        // We read the immutable params from the old contract so we don't have to redefine them
        PrincipleToken newImplementation = new PrincipleToken(
            address(oldPt.principleAsset()),
            address(oldPt.fundraiseFactory()),
            address(oldPt.settlement()),
            address(oldPt.guardFactory()),
            address(oldPt.positionManager())
        );
        console.log(
            "New PrincipleToken implementation deployed at:",
            address(newImplementation)
        );

        // 2. Upgrade the proxy to point to the new implementation
        if (proxyAdminAddress != address(0)) {
            // OpenZeppelin v5 logic via ProxyAdmin
            IProxyAdmin(proxyAdminAddress).upgradeAndCall(
                proxyAddress,
                address(newImplementation),
                ""
            );
        } else {
            // OpenZeppelin v4 logic direct to proxy
            ITransparentUpgradeableProxy(proxyAddress).upgradeTo(
                address(newImplementation)
            );
        }

        console.log("Proxy at", proxyAddress, "successfully upgraded.");

        vm.stopBroadcast();
    }
}
