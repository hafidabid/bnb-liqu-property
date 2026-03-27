// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title Errors
/// @author Azka Willian Muhammad
/// @notice Custom error definitions for the contract
/// @dev Using custom errors is more gas-efficient than require strings

library Errors {
    /// @notice Thrown when an invalid amount is provided
    /// @dev Used to indicate that a provided amount does not meet the required criteria
    error InvalidAmount();
    error NotThePrinciple();
    error NotAnAdmin();
    error UneligibleBalance();
    error InvalidPrincipleSupply();
    error InvalidBPS();
    error NotAnOperator();
    error PoolAddressIsZero();
    error AmountShouldNotBZero();
    error FinishedFundraise();
    error NotEnoughSupply();
    error NotYetMatured();
    error AlreadyDeployed();
    error TokenIdIsNotExist();
    error Irrelevant();
    error DeadlineExceeded();
    error NotAManager();
    error NotPositionOwner();
    error YieldPeriodNotElapsed();
    error ReportSLABreached();
    error TreasuryNotSet();
}
