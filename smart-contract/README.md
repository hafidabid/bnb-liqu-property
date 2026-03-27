# Foundry Upgradeable Contracts Starter Project

A complete Foundry project demonstrating upgradeable contracts using the Diamond Storage Pattern, TransparentUpgradeableProxy, and OpenZeppelin's upgradeable contracts.

## Features

- **SimpleContract**: Upgradeable contract with counter functionality
- **Diamond Storage Pattern**: Library-based storage using keccak256 slots for upgradeable-safe storage layout
- **TransparentUpgradeableProxy**: Secure proxy pattern for contract upgrades
- **Modular Architecture**: Separated view contracts, storage libraries, errors, and events
- **Comprehensive Tests**: Full test coverage for upgradeable contracts
- **Deployment Scripts**: Ready-to-use deployment scripts
- **OpenZeppelin Integration**: Uses industry-standard OpenZeppelin upgradeable contracts

## Prerequisites

- [Foundry](https://getfoundry.sh/) installed
- Git

## Installation

1. **Clone and install dependencies:**

```bash
# Install OpenZeppelin contracts (for proxy)
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Install OpenZeppelin upgradeable contracts
forge install OpenZeppelin/openzeppelin-contracts-upgradeable --no-commit

# Install Forge Standard Library
forge install foundry-rs/forge-std --no-commit
```

2. **Build the project:**

```bash
forge build
```

3. **Run tests:**

```bash
forge test
```

4. **Run tests with coverage:**

```bash
forge coverage
```

## Project Structure

```
├── src/
│   ├── SimpleContract.sol          # Main upgradeable contract
│   └── libraries/
│       ├── CounterStorage.sol      # Storage access library (Diamond Storage Pattern)
│       ├── Structs.sol             # Storage struct definitions
│       ├── SimpleContractView.sol  # View functions (abstract contract)
│       ├── Errors.sol              # Custom errors
│       └── Events.sol              # Event definitions
├── test/
│   └── SimpleContract.t.sol        # Tests for upgradeable contracts
├── script/
│   ├── Deploy.s.sol                # Deployment script (mocks)
│   └── DeployUpgradeable.s.sol     # Upgradeable deployment script
├── foundry.toml                    # Foundry configuration
├── remappings.txt                  # Import remappings
├── README.md                       # This file
└── UPGRADEABLE_GUIDE.md            # Comprehensive upgradeable contracts guide
```

## Usage

### Understanding the Pattern

This project uses the **Diamond Storage Pattern** for upgradeable contracts:

- **Storage**: Defined in `Structs.sol` and accessed via `CounterStorage.sol` library
- **View Functions**: Separated into `SimpleContractView.sol` abstract contract
- **Proxy**: Uses `TransparentUpgradeableProxy` for secure upgrades
- **Initialization**: Uses OpenZeppelin's `Initializable` pattern

For detailed information, see [UPGRADEABLE_GUIDE.md](./UPGRADEABLE_GUIDE.md).

### Deploying Contracts

1. **Set environment variables:**

```bash
export PRIVATE_KEY=your_private_key_here
export RPC_URL=your_rpc_url_here
export ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. **Deploy to local network:**

```bash
# Start local Anvil node
anvil

# In another terminal, deploy SimpleContract
forge script script/DeployUpgradeable.s.sol --rpc-url http://localhost:8545 --broadcast
```

3. **Deploy to testnet:**

```bash
forge script script/DeployUpgradeable.s.sol --rpc-url $RPC_URL --broadcast --verify
```

### Interacting with the Contract

```solidity
// After deployment, interact with the proxy address
SimpleContract contract = SimpleContract(proxyAddress);

// Increment counter for ID 1
contract.increment(1);

// Get counter value
uint256 count = contract.getIdToCounted(1);

// Check owner
address owner = contract.owner();
```

### Using Cast (Command Line)

```bash
# Get counter value
cast call $PROXY_ADDRESS "getIdToCounted(uint256)" 1 --rpc-url $RPC_URL

# Increment counter
cast send $PROXY_ADDRESS "increment(uint256)" 1 --private-key $PRIVATE_KEY --rpc-url $RPC_URL

# Get owner
cast call $PROXY_ADDRESS "owner()" --rpc-url $RPC_URL
```

## Testing

Run all tests:

```bash
forge test
```

Run specific test:

```bash
forge test --match-test test_increment_happy
```

Run tests with verbose output:

```bash
forge test -vvv
```

Run tests for upgradeable contracts:

```bash
forge test --match-contract SimpleContractTest
```

### Test Coverage

The test suite includes:

- Contract deployment verification
- Functionality tests (increment, view functions)
- Storage preservation tests
- Access control tests

## Architecture

### Diamond Storage Pattern

The project uses a library-based storage pattern for upgradeable contracts:

```solidity
// Structs.sol - Define storage structure
struct ModularStorage {
    mapping(uint256 => uint256) idToCounter;
}

// CounterStorage.sol - Access storage via library
library LibCounterStorage {
    bytes32 internal constant counterPoint = keccak256("counter.storage");

    function s() internal pure returns(ModularStorage storage $) {
        bytes32 slot = counterPoint;
        assembly {
            $.slot := slot
        }
    }
}
```

**Benefits:**

- Storage layout safety across upgrades
- No storage collisions
- Modular and extensible design
- Upgradeable-safe pattern

### View Contract Pattern

View functions are separated into an abstract contract:

```solidity
abstract contract SimpleContractView {
    using LibCounterStorage for *;

    function getIdToCounted(uint256 id) external view returns(uint256) {
        return LibCounterStorage.s().idToCounter[id];
    }
}
```

## Gas Optimization

The contracts are optimized for gas efficiency:

- Uses Solidity 0.8.13+ with optimizer enabled
- Diamond storage pattern for efficient storage access
- Direct storage access via assembly
- Minimal external calls

## Security Features

- **OwnableUpgradeable**: Access control for administrative functions
- **Initializable**: Safe initialization pattern preventing re-initialization attacks
- **TransparentUpgradeableProxy**: Secure proxy pattern with admin separation
- **Storage Safety**: Diamond storage pattern prevents storage collisions
- **Safe Math**: Built-in overflow protection (Solidity 0.8+)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Upgradeable Contracts Guide

For comprehensive information on working with upgradeable contracts, see [UPGRADEABLE_GUIDE.md](./UPGRADEABLE_GUIDE.md), which covers:

- Diamond Storage Pattern details
- Deployment procedures
- Upgrade procedures
- Testing strategies
- Security best practices
- Common issues and solutions

## Support

For questions and support:

- Check the [Foundry Book](https://book.getfoundry.sh/)
- Review [OpenZeppelin Upgradeable Contracts documentation](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- Review [Diamond Storage Pattern](https://dev.to/mudgen/solidity-diamond-storage-pattern-2j3m)
- Open an issue in this repository
# poc-04
# LiquProp
