# Foundry Upgradeable Contracts Guide

This guide covers how to work with upgradeable contracts using Foundry and OpenZeppelin's upgradeable contracts pattern with the Diamond Storage Pattern.

## Overview

Upgradeable contracts use a proxy pattern where:

- **Implementation Contract**: Contains the actual logic
- **Proxy Contract**: Delegates calls to the implementation and stores state
- **Storage**: All state is stored in the proxy, not the implementation
- **Diamond Storage Pattern**: Uses library-based storage with keccak256 slots for upgradeable-safe storage layout

## Project Structure

```
├── src/
│   ├── SimpleContract.sol          # Main upgradeable contract
│   ├── SimpleContractV2.sol       # V2 implementation (future)
│   └── libraries/
│       ├── CounterStorage.sol      # Storage access library
│       ├── Structs.sol             # Storage struct definitions
│       ├── SimpleContractView.sol # View functions (abstract contract)
│       ├── Errors.sol              # Custom errors
│       └── Events.sol              # Event definitions
├── script/
│   ├── DeployUpgradeable.s.sol     # Deploy V1
│   └── UpgradeContract.s.sol      # Upgrade to V2 (future)
├── test/
│   └── SimpleContract.t.sol        # Tests for upgradeable contracts
└── UPGRADEABLE_GUIDE.md            # This guide
```

## Installation Commands

```bash
# Install OpenZeppelin contracts (for proxy)
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Install OpenZeppelin upgradeable contracts
forge install OpenZeppelin/openzeppelin-contracts-upgradeable --no-commit

# Install Forge Standard Library
forge install foundry-rs/forge-std --no-commit
```

## Key Concepts

### 1. Initializable Pattern

- Use `initializer` modifier instead of constructor
- Call `_disableInitializers()` in constructor
- Initialize state in `initialize()` function

### 2. Proxy Pattern

This project uses **TransparentUpgradeableProxy** from OpenZeppelin:

- Admin can upgrade the proxy
- Regular users interact with the implementation
- More secure for access control

### 3. Diamond Storage Pattern

This project uses a library-based storage pattern for upgradeable contracts:

#### Storage Structure

**Structs.sol** - Defines the storage struct:

```solidity
struct ModularStorage {
    mapping(uint256 => uint256) idToCounter;
}
```

**CounterStorage.sol** - Provides storage access via keccak256 slot:

```solidity
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

**Usage in Contract**:

```solidity
using LibCounterStorage for *;

function increment(uint256 id) public {
    LibCounterStorage.s().idToCounter[id]++;
}
```

#### Benefits of Diamond Storage Pattern

- **Storage Layout Safety**: Storage is isolated in libraries, reducing upgrade risks
- **No Storage Collisions**: Each library uses a unique keccak256 slot
- **Modular Design**: Easy to add new storage without affecting existing layout
- **Upgradeable Safe**: Adding new storage variables doesn't break existing storage

### 4. View Contract Pattern

**SimpleContractView.sol** - Abstract contract for view functions:

```solidity
abstract contract SimpleContractView {
    using LibCounterStorage for *;

    function getIdToCounted(uint256 id) external view returns(uint256) {
        return LibCounterStorage.s().idToCounter[id];
    }
}
```

The main contract inherits from this view contract to separate view logic.

### 5. Storage Layout Safety

- **CRITICAL**: Never modify existing storage structs between versions
- Add new fields to the end of storage structs
- Each library should use a unique keccak256 constant
- Test storage preservation after upgrades

## Command Line Usage

### 1. Build Contracts

```bash
# Build all contracts
forge build

# Build specific contract
forge build --contracts src/SimpleContract.sol
```

### 2. Run Tests

```bash
# Run all tests
forge test

# Run upgradeable tests only
forge test --match-contract SimpleContractTest

# Run specific test
forge test --match-test test_increment_happy

# Run with verbose output
forge test -vvv
```

### 3. Deploy Contracts

#### Deploy V1 (Initial Deployment)

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key_here
export RPC_URL=your_rpc_url_here

# Deploy to local network
forge script script/DeployUpgradeable.s.sol --rpc-url http://localhost:8545 --broadcast

# Deploy to testnet
forge script script/DeployUpgradeable.s.sol --rpc-url $RPC_URL --broadcast --verify
```

#### Deploy SimpleContract

```bash
# Deploy SimpleContract using TransparentUpgradeableProxy
forge script script/DeploySimpleContract.s.sol --rpc-url $RPC_URL --broadcast

# The script should output:
# - Implementation address
# - Proxy address
# - Admin address
```

#### Upgrade to V2

```bash
# Set proxy address from V1 deployment
export PROXY_ADDRESS=0x... # Address from V1 deployment

# Upgrade to V2
forge script script/UpgradeContract.s.sol --rpc-url $RPC_URL --broadcast
```

### 4. Interact with Contracts

#### Using Cast

```bash
# Get counter value for an ID
cast call $PROXY_ADDRESS "getIdToCounted(uint256)" 1 --rpc-url $RPC_URL

# Get owner
cast call $PROXY_ADDRESS "owner()" --rpc-url $RPC_URL

# Increment counter (requires private key)
cast send $PROXY_ADDRESS "increment(uint256)" 1 --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

#### Using Foundry Console

```bash
# Start local node
anvil

# In another terminal, start console
forge console --rpc-url http://localhost:8545

# In console, interact with contracts
$ contract = SimpleContract.at("0x...")
$ contract.getIdToCounted(1)
$ contract.increment(1)
$ contract.owner()
```

### 5. Verify Contracts

#### Verify Implementation

```bash
# Verify V1 implementation
forge verify-contract $IMPLEMENTATION_ADDRESS src/SimpleContract.sol:SimpleContract --etherscan-api-key $ETHERSCAN_API_KEY --chain-id 11155111

# Verify V2 implementation (when available)
forge verify-contract $IMPLEMENTATION_V2_ADDRESS src/SimpleContractV2.sol:SimpleContractV2 --etherscan-api-key $ETHERSCAN_API_KEY --chain-id 11155111
```

#### Verify Proxy

```bash
# Verify TransparentUpgradeableProxy
# Get initialization data
INIT_DATA=$(cast abi-encode "initialize(address)" $ADMIN_ADDRESS)

# Verify proxy
forge verify-contract $PROXY_ADDRESS @openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy --etherscan-api-key $ETHERSCAN_API_KEY --chain-id 11155111 --constructor-args $(cast abi-encode "constructor(address,address,bytes)" $IMPLEMENTATION_ADDRESS $ADMIN_ADDRESS $INIT_DATA)
```

## Testing Upgradeable Contracts

### 1. Test Deployment

```bash
forge test --match-test test_deployment
```

### 2. Test Functionality

```bash
# Test increment function
forge test --match-test test_increment_happy
```

### 3. Test Storage Preservation

```bash
# Test that storage persists after operations
forge test --match-test test_storage_preservation
```

### 4. Test Access Control

```bash
# Test that only owner can perform admin functions
forge test --match-test testFail_unauthorized_access
```

### Example Test Structure

```solidity
contract SimpleContractTest is Test {
    SimpleContract public simple;
    TransparentUpgradeableProxy public proxy;
    address admin = makeAddr("admin");

    function setUp() public {
        simple = new SimpleContract();
        bytes memory data = abi.encodeWithSignature("initialize(address)", admin);
        proxy = new TransparentUpgradeableProxy(address(simple), address(this), data);
        simple = SimpleContract(address(proxy));
    }

    function test_increment_happy() public {
        simple.increment(1);
        assertEq(simple.getIdToCounted(1), 1);
    }
}
```

## Gas Optimization

### 1. Storage Library Pattern

- Diamond storage pattern is gas efficient
- Direct storage access via assembly
- No additional storage overhead

### 2. Minimize Storage Reads

- Cache frequently accessed storage variables
- Use events for off-chain data
- Access storage via library functions: `LibCounterStorage.s().idToCounter[id]`

### 3. Batch Operations

- Combine multiple operations in single transaction
- Use arrays for bulk operations
- Consider adding batch increment functions if needed

## Security Best Practices

### 1. Access Control

- Always use `onlyOwner` for upgrade functions
- Consider multi-sig for production upgrades
- Use timelock for critical upgrades

### 2. Storage Safety

- **Never modify existing storage structs** - Only add new fields at the end
- **Use unique keccak256 constants** - Each storage library must have a unique slot
- **Test storage preservation** - Verify data persists after upgrades
- **Document storage layout** - Keep track of all storage structs and their fields
- **Storage library pattern** - This pattern helps prevent storage collisions

### 3. Initialization

- Use `initializer` modifier
- Prevent re-initialization attacks
- Validate all parameters

## Common Issues and Solutions

### 1. "Contract not found" Error

```bash
# Solution: Check if contract is built
forge build
# Check if proxy address is correct
cast code $PROXY_ADDRESS --rpc-url $RPC_URL
```

### 2. "Invalid opcode" Error

```bash
# Solution: Check if implementation is deployed
cast code $IMPLEMENTATION_ADDRESS --rpc-url $RPC_URL
# Verify proxy points to correct implementation
cast call $PROXY_ADDRESS "implementation()" --rpc-url $RPC_URL
```

### 3. "Storage layout incompatible" Error

```bash
# Solution: Check storage layout
forge inspect SimpleContract storage-layout
forge inspect SimpleContractV2 storage-layout

# Check storage struct layout
# Review src/libraries/Structs.sol to ensure compatibility
```

## Advanced Features

### 1. Adding New Storage Variables

When upgrading, add new fields to the storage struct:

**Structs.sol** (V1):

```solidity
struct ModularStorage {
    mapping(uint256 => uint256) idToCounter;
}
```

**Structs.sol** (V2) - Add new fields at the end:

```solidity
struct ModularStorage {
    mapping(uint256 => uint256) idToCounter;
    // New fields added here
    mapping(address => uint256) addressToCount;
    uint256 totalCount;
}
```

### 2. Creating New Storage Libraries

For new storage modules, create a new library with a unique slot:

```solidity
library LibNewStorage {
    bytes32 internal constant newStoragePoint = keccak256("new.storage");

    function s() internal pure returns(NewStorageStruct storage $) {
        bytes32 slot = newStoragePoint;
        assembly {
            $.slot := slot
        }
    }
}
```

### 3. Extending View Contracts

Add new view functions to the view contract:

```solidity
abstract contract SimpleContractView {
    using LibCounterStorage for *;

    function getIdToCounted(uint256 id) external view returns(uint256) {
        return LibCounterStorage.s().idToCounter[id];
    }

    // New view functions can be added here
    function getTotalCount() external view returns(uint256) {
        return LibCounterStorage.s().totalCount;
    }
}
```

### 4. Upgrade with Data

When using TransparentUpgradeableProxy, upgrades are handled by the proxy admin:

```solidity
// In upgrade script
TransparentUpgradeableProxy proxy = TransparentUpgradeableProxy(payable(proxyAddress));
proxy.upgradeToAndCall(newImplementation, initData);
```

## Monitoring and Debugging

### 1. Check Implementation

```bash
cast call $PROXY_ADDRESS "implementation()" --rpc-url $RPC_URL
```

### 2. Check Admin

```bash
cast call $PROXY_ADDRESS "owner()" --rpc-url $RPC_URL
```

### 3. Check Storage

```bash
# Check storage at specific slot
cast storage $PROXY_ADDRESS <SLOT_NUMBER> --rpc-url $RPC_URL

# Check all storage slots
cast storage $PROXY_ADDRESS --rpc-url $RPC_URL

# Calculate storage slot for diamond storage
# The slot is keccak256("counter.storage")
cast keccak "counter.storage"
```

## Production Deployment Checklist

- [ ] Test upgrades on testnet
- [ ] Verify all contracts on Etherscan
- [ ] Set up monitoring for upgrade events
- [ ] Document upgrade procedures
- [ ] Test emergency pause functionality
- [ ] Verify access control is working
- [ ] Check gas usage optimization
- [ ] Review security considerations

## Code Examples

### SimpleContract.sol Structure

```solidity
contract SimpleContract is Initializable, OwnableUpgradeable, SimpleContractView {
    using LibCounterStorage for *;

    function initialize(address adminOwner) public initializer {
        __Ownable_init(adminOwner);
    }

    constructor() {
        _disableInitializers();
    }

    function increment(uint256 id) public {
        LibCounterStorage.s().idToCounter[id]++;
    }
}
```

### Storage Library Pattern

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

### View Contract Pattern

```solidity
// SimpleContractView.sol - Separate view functions
abstract contract SimpleContractView {
    using LibCounterStorage for *;

    function getIdToCounted(uint256 id) external view returns(uint256) {
        return LibCounterStorage.s().idToCounter[id];
    }
}
```

## Resources

- [OpenZeppelin Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Diamond Storage Pattern](https://dev.to/mudgen/solidity-diamond-storage-pattern-2j3m)
- [Proxy Patterns](https://blog.openzeppelin.com/proxy-patterns/)
- [Transparent Proxy Pattern](https://docs.openzeppelin.com/contracts/4.x/api/proxy#transparent)
