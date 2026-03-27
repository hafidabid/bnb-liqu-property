// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {SimpleContract} from "../src/SimpleContract.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract SimpleContractTest is Test {
    SimpleContract public simple;
    TransparentUpgradeableProxy public proxy;

    address admin = makeAddr("admin");
    address computeSimpleContract;

    function setUp() public {
        //create select fork
        uint64 nonce = vm.getNonce(address(this));
        computeSimpleContract = vm.computeCreateAddress(address(this), nonce + 1);

        simple = new SimpleContract();

        bytes memory data = abi.encodeWithSignature("initialize(address)", admin);

        vm.setNonce(address(this), nonce + 1);
        proxy = new TransparentUpgradeableProxy(address(simple), address(this), data);
        simple = SimpleContract(address(proxy));
    }

    function test_deployment() public view {
        assertEq(address(proxy), computeSimpleContract, "should be equal");
    }

    function test_increment_happy() public {
        simple.increment(1);

        assertEq(simple.getIdToCounted(1), 1);
    }
}
