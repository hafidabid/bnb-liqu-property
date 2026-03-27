// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title MyToken
/// @author Azka Willian Muhammad
/// @notice A mock ERC20 token contract with minting, burning, and pausing capabilities
/// @dev This is a non-upgradeable ERC20 token for testing purposes
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

contract MyToken is ERC20, Ownable, ERC20Burnable, ERC20Pausable {
    /// @notice The number of decimals for the token
    uint8 private _decimals;

    /// @notice Constructs the MyToken contract
    /// @param name The name of the token
    /// @param symbol The symbol of the token
    /// @param decimals_ The number of decimals for the token
    /// @param initialSupply The initial supply of tokens to mint
    /// @param initialOwner The address that will own the contract and receive initial supply
    constructor(string memory name, string memory symbol, uint8 decimals_, uint256 initialSupply, address initialOwner)
        ERC20(name, symbol)
        Ownable(initialOwner)
    {
        _decimals = decimals_;
        _mint(initialOwner, initialSupply * 10 ** decimals_);
    }

    /// @notice Returns the number of decimals for the token
    /// @dev Overrides the default ERC20 decimals function
    /// @return The number of decimals
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /// @notice Pauses all token transfers
    /// @dev Can only be called by the owner
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Unpauses all token transfers
    /// @dev Can only be called by the owner
    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Mints new tokens to a specified address
    /// @dev Can only be called by the owner
    /// @param to The address to receive the minted tokens
    /// @param amount The amount of tokens to mint
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /// @notice Updates the state of token transfers
    /// @dev Required override to handle both ERC20 and ERC20Pausable inheritance
    /// @param from The address tokens are transferred from
    /// @param to The address tokens are transferred to
    /// @param value The amount of tokens being transferred
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
