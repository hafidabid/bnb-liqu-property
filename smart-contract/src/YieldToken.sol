// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Events} from "./libraries/Events.sol";

contract YieldToken is ERC20, Ownable {
    error BasePriceAddressCannotBeZero();
    error OnlyBasePriceCanMint();
    error InsufficientBalance();

    address public basePrice;

    constructor(string memory name, string memory symbol, address owner_) ERC20(name, symbol) Ownable(owner_) {}

    function setBasePrice(address basePrice_) external onlyOwner {
        address pre = basePrice;
        basePrice = basePrice_;

        emit Events.GuardVaultIsSet(pre, basePrice);
    }

    function mint(address to, uint256 amount) public {
        if (msg.sender != basePrice) revert OnlyBasePriceCanMint();
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        if (balanceOf(msg.sender) < amount) revert InsufficientBalance();
        _burn(msg.sender, amount);
    }
}
