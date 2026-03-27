// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title MyTokenUpgradeableV2
/// @author Azka Willian Muhamamd
/// @notice An upgradeable ERC20 token contract V2 with max transfer limits
/// @dev This contract demonstrates upgrading from V1 to V2 with new features
/// @dev Uses the UUPS (Universal Upgradeable Proxy Standard) pattern
/// @dev This is a mock contract for testing upgradeable token functionality
import "@openzeppelin-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin-upgradeable/contracts/access/OwnableUpgradeable.sol";
import "@openzeppelin-upgradeable/contracts/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin-upgradeable/contracts/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin-upgradeable/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";

contract MyTokenUpgradeableV2 is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    UUPSUpgradeable
{
    /// @notice The number of decimals for the token
    uint8 private _decimals;

    /// @notice Maximum amount that can be transferred in a single transaction
    /// @dev Only enforced when maxTransferEnabled is true
    uint256 public maxTransferAmount;

    /// @notice Mapping to track addresses excluded from max transfer limits
    /// @dev Excluded addresses can transfer any amount regardless of maxTransferAmount
    mapping(address => bool) public isExcludedFromMaxTransfer;

    /// @notice Flag to enable/disable max transfer amount enforcement
    bool public maxTransferEnabled;

    /// @notice Constructor that disables initializers
    /// @dev Prevents the implementation contract from being initialized
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the upgradeable token contract V2
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

        // Initialize V2 features
        maxTransferAmount = 1000 * 10 ** decimals_; // 1000 tokens
        maxTransferEnabled = false;
        isExcludedFromMaxTransfer[initialOwner] = true;
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

    /// @notice Sets the maximum transfer amount
    /// @dev Can only be called by the owner
    /// @dev V2 feature: Allows limiting transfer amounts
    /// @param _maxAmount The new maximum transfer amount
    function setMaxTransferAmount(uint256 _maxAmount) public onlyOwner {
        maxTransferAmount = _maxAmount;
    }

    /// @notice Enables or disables max transfer amount enforcement
    /// @dev Can only be called by the owner
    /// @dev V2 feature: Toggle max transfer limit enforcement
    /// @param _enabled True to enable max transfer limits, false to disable
    function setMaxTransferEnabled(bool _enabled) public onlyOwner {
        maxTransferEnabled = _enabled;
    }

    /// @notice Sets whether an address is excluded from max transfer limits
    /// @dev Can only be called by the owner
    /// @dev V2 feature: Allow certain addresses to bypass transfer limits
    /// @param _account The address to set exclusion status for
    /// @param _excluded True to exclude from limits, false to include in limits
    function setExcludedFromMaxTransfer(address _account, bool _excluded) public onlyOwner {
        isExcludedFromMaxTransfer[_account] = _excluded;
    }

    /// @notice Updates the state of token transfers with V2 max transfer check
    /// @dev Required override to handle both ERC20Upgradeable and ERC20PausableUpgradeable inheritance
    /// @dev V2 feature: Enforces max transfer amount if enabled
    /// @param from The address tokens are transferred from
    /// @param to The address tokens are transferred to
    /// @param value The amount of tokens being transferred
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        // V2: Add max transfer check
        if (maxTransferEnabled && !isExcludedFromMaxTransfer[from] && !isExcludedFromMaxTransfer[to]) {
            require(value <= maxTransferAmount, "Transfer amount exceeds maximum");
        }

        super._update(from, to, value);
    }

    /// @notice Authorizes an upgrade to a new implementation
    /// @dev Required by UUPSUpgradeable, can only be called by the owner
    /// @param newImplementation The address of the new implementation contract
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
