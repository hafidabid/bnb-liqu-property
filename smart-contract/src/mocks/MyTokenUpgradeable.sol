// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title MyTokenUpgradeable
/// @author Azka Willian Muhammad
/// @notice An upgradeable ERC20 token contract with minting, burning, and pausing capabilities
/// @dev This contract uses the UUPS (Universal Upgradeable Proxy Standard) pattern
/// @dev This is a mock contract for testing upgradeable token functionality
import "@openzeppelin-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin-upgradeable/contracts/access/OwnableUpgradeable.sol";
import "@openzeppelin-upgradeable/contracts/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin-upgradeable/contracts/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin-upgradeable/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";

contract MyTokenUpgradeable is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    UUPSUpgradeable
{
    /// @notice The number of decimals for the token
    uint8 private _decimals;

    /// @notice Constructor that disables initializers
    /// @dev Prevents the implementation contract from being initialized
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the upgradeable token contract
    /// @dev This function replaces the constructor for upgradeable contracts
    /// @dev Can only be called once due to the initializer modifier
    /// @param name The name of the token
    /// @param symbol The symbol of the token
    /// @param decimals_ The number of decimals for the token
    /// @param initialSupply The initial supply of tokens to mint
    /// @param initialOwner The address that will own the contract and receive initial supply
    function initialize(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply,
        address initialOwner
    ) public initializer {
        __ERC20_init(name, symbol);
        __Ownable_init(initialOwner);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __UUPSUpgradeable_init();

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

    /// @notice Authorizes an upgrade to a new implementation
    /// @dev Required by UUPSUpgradeable, can only be called by the owner
    /// @param newImplementation The address of the new implementation contract
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Updates the state of token transfers
    /// @dev Required override to handle both ERC20Upgradeable and ERC20PausableUpgradeable inheritance
    /// @param from The address tokens are transferred from
    /// @param to The address tokens are transferred to
    /// @param value The amount of tokens being transferred
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._update(from, to, value);
    }
}
