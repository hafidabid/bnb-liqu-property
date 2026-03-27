// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/mocks/MyTokenUpgradeable.sol";

contract DeployUpgradeableScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the implementation contract
        MyTokenUpgradeable implementation = new MyTokenUpgradeable();
        console.log("Implementation deployed at:", address(implementation));

        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            MyTokenUpgradeable.initialize.selector,
            "UpgradeableToken",
            "UPT",
            18,
            1000000, // 1 million tokens
            deployer
        );

        // Deploy the proxy contract
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("Proxy deployed at:", address(proxy));

        // Get the token instance through the proxy
        MyTokenUpgradeable token = MyTokenUpgradeable(address(proxy));
        console.log("Token name:", token.name());
        console.log("Token symbol:", token.symbol());
        console.log("Token total supply:", token.totalSupply());
        console.log("Token owner:", token.owner());

        vm.stopBroadcast();
    }
}
