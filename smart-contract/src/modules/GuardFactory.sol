// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {PrincipleGuard} from "../PrincipleGuard.sol";
import {YieldToken} from "../YieldToken.sol";
import {Errors} from "../libraries/Errors.sol";

contract GuardFactory {
    address public operator;
    address public settlement;
    address public positionManager;
    address public owner;

    modifier onlyOperator() {
        if (msg.sender != operator) revert Errors.NotAnOperator();
        _;
    }

    constructor(
        address operator_,
        address settlement_,
        address positionManager_
    ) {
        operator = operator_;
        settlement = settlement_;
        positionManager = positionManager_;
        owner = msg.sender;
    }

    /// @notice Wire the operator (PrincipleToken) after deployment
    function setOperator(address operator_) external {
        if (msg.sender != owner) revert Errors.NotAnOperator();
        operator = operator_;
    }

    function deployGuard(
        address _yieldToken
    ) external onlyOperator returns (address guardVault) {
        guardVault = address(
            new PrincipleGuard(_yieldToken, settlement, positionManager)
        );
    }

    function deployYieldToken(
        string memory name_,
        string memory symbol_
    ) external onlyOperator returns (address yieldToken) {
        yieldToken = address(new YieldToken(name_, symbol_, operator));
    }
}
