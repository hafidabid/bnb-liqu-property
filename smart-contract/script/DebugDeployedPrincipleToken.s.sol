// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {PrincipleToken} from "../src/PrincipleToken.sol";
import {PrincipleAsset} from "../src/PrincipleAsset.sol";
import {
    PositionInput,
    PrincipleSupply,
    FeeType
} from "../src/libraries/Structs.sol";

/// @title DebugDeployedPrincipleToken
/// @notice Script to debug an exact error when minting on live Base Sepolia
contract DebugDeployedPrincipleToken is Script {
    // ==========================================
    // Fill these with the addresses from your deployment
    // ==========================================
    address constant PT_PROXY = 0xAD062040F5aD77726ec82897bbEC106E59643AF6;
    address constant ASSET_PROXY = 0xeEAbe0a6aCB9D8715164b5630b836Cc4205D8Eb2;

    function run() public {
        uint256 deployerPk = vm.envUint("CHAINLINK_DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);

        console.log("Debugging via account:", deployer);

        PrincipleToken pt = PrincipleToken(PT_PROXY);
        PrincipleAsset asset = PrincipleAsset(ASSET_PROXY);

        // 1. We create a fork here, so all state is exactly as it is live on the network right now
        vm.createSelectFork(vm.envString("BASE_SEPOLIA_RPC_URL"));

        // 2. Start prank to act as our real wallet
        vm.startPrank(deployer);

        // 3. Register a new property on the live configuration
        uint256 tokenId = pt.registerProperty("ipfs://debug-property-uri");
        console.log("Registered property, got id:", tokenId);

        // 4. Approve the live PT proxy to spend our live Asset proxy
        asset.approve(PT_PROXY, tokenId);
        console.log("Approved Asset Proxy for PT Proxy interaction");

        PositionInput memory validInput = PositionInput({
            tokenId: tokenId,
            presaleAmount: 5000,
            deadline: block.timestamp + 7 days,
            totalSupply: PrincipleSupply.FIRST,
            presalePrice: 100e6,
            holderYieldBPS: 8000,
            baselineYieldBPS: 1000,
            yieldPeriodSeconds: 30 * 24 * 60 * 60,
            reportPeriodSeconds: 30 * 24 * 60 * 60,
            feeType: FeeType.YIELD_PERCENTAGE
        });

        console.log(uint256(validInput.totalSupply));
        console.log(validInput.presaleAmount);
        console.log(validInput.deadline);
        console.log(validInput.presalePrice);
        console.log(validInput.holderYieldBPS);
        console.log(validInput.baselineYieldBPS);
        console.log(validInput.yieldPeriodSeconds);
        console.log(validInput.reportPeriodSeconds);
        console.log(uint256(validInput.feeType));

        console.log("Will attempt to call mintPrinciple...");

        // 5. This is where it fails for you live, but succeeds on unit tests.
        // We do it here in a script so we can get a full Forge trace of EXACTLY where and why it is reverting on the real network.
        pt.mintPrinciple(validInput);

        console.log("Success! (If you see this, it didn't revert)");

        vm.stopPrank();
    }
}
