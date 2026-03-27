// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IPrincipleAsset} from "../interfaces/IPrincipleAsset.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC165, IERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {Errors} from "../libraries/Errors.sol";

contract Fundraise is ERC165, IERC721Receiver, IERC1155Receiver {
    IERC1155 public principleToken;
    IPrincipleAsset public principleAsset;
    address public principleOwner;
    address public settlement;
    address public operator;
    uint256 public tokenId;

    constructor(
        address principleOwner_,
        address settlement_,
        address operator_,
        address erc721,
        address erc1155,
        uint256 tokenId_
    ) {
        principleOwner = principleOwner_;
        settlement = settlement_;
        operator = operator_;
        principleAsset = IPrincipleAsset(erc721);
        principleToken = IERC1155(erc1155);
        tokenId = tokenId_;
    }

    function transferPrincipleToken(address to, uint256 amount) external {
        if (msg.sender != operator) revert Errors.NotAnOperator();
        principleToken.safeTransferFrom(address(this), to, tokenId, amount, "");
    }

    function transferSettlement(address to, uint256 amount) external {
        if (msg.sender != operator) revert Errors.NotAnOperator();
        IERC20(settlement).transfer(to, amount);
    }

    function transferPrincipleAsset(address to) external {
        if (msg.sender != operator) revert Errors.NotAnOperator();
        principleAsset.safeTransferFrom(address(this), to, tokenId);
    }
    /// @notice Handles the receipt of a single ERC721 token
    /// @return bytes4 The function selector to confirm the token transfer

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice Handles the receipt of a single ERC1155 token type
    /// @return bytes4 The function selector to confirm the token transfer
    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    /// @notice Handles the receipt of multiple ERC1155 token types
    /// @return bytes4 The function selector to confirm the token transfer
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    /// @notice Query if a contract implements an interface
    /// @param interfaceId The interface identifier, as specified in ERC-165
    /// @return bool True if the contract implements interfaceId, false otherwise
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId || interfaceId == type(IERC1155Receiver).interfaceId
            || super.supportsInterface(interfaceId);
    }
}
