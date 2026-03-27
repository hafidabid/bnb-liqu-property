// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {MyToken} from "../src/mocks/MyToken.sol";
import {TokenFactory} from "../src/mocks/TokenFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Token Factory
        TokenFactory factory = new TokenFactory(deployer);
        console.log("TokenFactory deployed at:", address(factory));

        // Deploy a sample token
        address tokenAddress = factory.deployToken(
            "SampleToken",
            "SMPL",
            18,
            1000000 // 1 million tokens
        );
        console.log("Sample token deployed at:", tokenAddress);

        vm.stopBroadcast();
    }
}
