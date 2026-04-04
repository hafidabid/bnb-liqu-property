// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Fundraise} from "./Fundraise.sol";
import {Errors} from "../libraries/Errors.sol";

contract FundraiseFactory {
    address public operator;
    address public settlement;
    address public erc721;
    address public erc1155;
    address public owner;

    constructor(
        address operator_,
        address settlement_,
        address erc721_,
        address erc1155_
    ) {
        operator = operator_;
        settlement = settlement_;
        erc721 = erc721_;
        erc1155 = erc1155_;
        owner = msg.sender;
    }

    /// @notice Wire the operator (PrincipleToken) after deployment
    function setOperator(address operator_) external {
        if (msg.sender != owner) revert Errors.NotAnOperator();
        operator = operator_;
        erc1155 = operator_;
    }

    function deploy(
        address owner_,
        uint256 tokenId
    ) external returns (address) {
        if (msg.sender != operator) revert Errors.NotAnOperator();
        Fundraise fundraise = new Fundraise(
            owner_,
            settlement,
            operator,
            erc721,
            erc1155,
            tokenId
        );
        return address(fundraise);
    }
}
