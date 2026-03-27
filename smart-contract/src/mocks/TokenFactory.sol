// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title TokenFactory
/// @author Azka Willian Muhammad
/// @notice Factory contract for deploying multiple ERC20 token instances
/// @dev This is a mock contract for testing factory pattern functionality
import "./MyToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenFactory is Ownable {
    /// @notice Array of all deployed token contracts
    MyToken[] public deployedTokens;

    /// @notice Mapping to check if an address is a deployed token
    mapping(address => bool) public isDeployedToken;

    /// @notice Emitted when a new token is deployed
    /// @param tokenAddress The address of the newly deployed token
    /// @param name The name of the token
    /// @param symbol The symbol of the token
    event TokenDeployed(address indexed tokenAddress, string name, string symbol);

    /// @notice Constructs the TokenFactory contract
    /// @param initialOwner The address that will own the factory contract
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Deploys a new MyToken contract
    /// @dev Can only be called by the owner
    /// @param name The name of the token to deploy
    /// @param symbol The symbol of the token to deploy
    /// @param decimals The number of decimals for the token
    /// @param initialSupply The initial supply of tokens to mint
    /// @return The address of the newly deployed token contract
    function deployToken(string memory name, string memory symbol, uint8 decimals, uint256 initialSupply)
        external
        onlyOwner
        returns (address)
    {
        MyToken token = new MyToken(name, symbol, decimals, initialSupply, msg.sender);

        deployedTokens.push(token);
        isDeployedToken[address(token)] = true;

        emit TokenDeployed(address(token), name, symbol);
        return address(token);
    }

    /// @notice Returns all deployed token contracts
    /// @return An array of all deployed MyToken contract addresses
    function getDeployedTokens() external view returns (MyToken[] memory) {
        return deployedTokens;
    }

    /// @notice Returns the total number of deployed tokens
    /// @return The count of deployed token contracts
    function getDeployedTokensCount() external view returns (uint256) {
        return deployedTokens.length;
    }
}
