// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {PrincipleToken} from "../src/PrincipleToken.sol";
import {PrincipleAsset} from "../src/PrincipleAsset.sol";
import {FundraiseFactory} from "../src/modules/FundraiseFactory.sol";
import {GuardFactory} from "../src/modules/GuardFactory.sol";
import {PrincipleRouter} from "../src/modules/PrincipleRouter.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

contract PrincipleTokenScript is Script {
    PrincipleToken public pt;
    PrincipleAsset public asset;
    PrincipleRouter public pr;
    FundraiseFactory public factory;
    MockUSD public usdc;
    TransparentUpgradeableProxy public proxy;
    ProxyAdmin public proxyAdmin = ProxyAdmin(vm.envAddress("PROXY_ADMIN_PT_BASE_SEPOLIA"));
    GuardFactory public guardFactory;

    uint256 public privateKey = vm.envUint("CHAINLINK_DEPLOYER_PK");
    address public positionManager = vm.envAddress("BASE_SEPOLIA_POSITION_MANAGER");
    address public computePrincipleContract;
    address public computeAssetContract;
    address public swapRouter02 = vm.envAddress("SWAP_ROUTER_02_BASE_SEPOLIA");

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_SEPOLIA_RPC_URL"));
    }

    function run() public {
        vm.startBroadcast(privateKey);

        _deployPrincipleToken();
        _deploySwap();

        vm.stopBroadcast();
    }

    function _deployPrincipleToken() internal returns (address) {
        uint64 nonce = vm.getNonce(vm.addr(privateKey));
        computePrincipleContract = vm.computeCreateAddress(vm.addr(privateKey), nonce + 6);
        computeAssetContract = vm.computeCreateAddress(vm.addr(privateKey), nonce + 4);

        usdc = new MockUSD();
        guardFactory = new GuardFactory(computePrincipleContract, address(usdc), positionManager);
        factory = new FundraiseFactory(
            computePrincipleContract, address(usdc), computeAssetContract, computePrincipleContract
        );

        asset = new PrincipleAsset();
        bytes memory data = abi.encodeWithSignature(
            "initialize(address,address,string,string)",
            vm.addr(privateKey),
            computePrincipleContract,
            "AssetToken",
            "AT"
        );

        proxy = new TransparentUpgradeableProxy(address(asset), vm.addr(privateKey), data);
        asset = PrincipleAsset(address(proxy));

        pt = new PrincipleToken(address(asset), address(factory), address(usdc), address(guardFactory), positionManager);
        data = abi.encodeWithSignature(
            "initialize(address,address,string)", vm.addr(privateKey), vm.addr(privateKey), "PrincipleToken", "PT"
        );

        vm.setNonce(vm.addr(privateKey), nonce + 6);
        proxy = new TransparentUpgradeableProxy(address(pt), vm.addr(privateKey), data);
        pt = PrincipleToken(address(proxy));

        console.log("usdc : ", address(usdc));
        console.log("guardFactory : ", address(guardFactory));
        console.log("factory : ", address(factory));
        console.log("asset : ", address(asset));
        console.log("pt : ", address(pt));

        return address(usdc);
    }

    function _deploySwap() internal {
        pr = new PrincipleRouter(swapRouter02, address(usdc));
        bytes memory data = abi.encodeWithSignature("initialize()");

        proxy = new TransparentUpgradeableProxy(address(pr), vm.addr(privateKey), data);

        console.log("swap router address is : ", address(proxy));
    }

    function _upgradePt() internal {
        pt = new PrincipleToken(
            vm.envAddress("CH_ASSET"),
            vm.envAddress("CH_FACTORY"),
            vm.envAddress("CH_USDC"),
            vm.envAddress("CH_GUARD_FACTORY"),
            positionManager
        );
        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(vm.envAddress("CH_PT")), address(pt), "");
    }
}
