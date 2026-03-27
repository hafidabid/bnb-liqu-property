// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title SimpleContract
/// @author Your Name
/// @notice An upgradeable contract demonstrating the Diamond Storage Pattern
/// @dev This contract uses library-based storage for upgradeable-safe state management
/// @dev Inherits from Initializable, OwnableUpgradeable, and SimpleContractView
import {
    Initializable
} from "@openzeppelin-upgradeable/contracts/proxy/utils/Initializable.sol";
import {
    OwnableUpgradeable
} from "@openzeppelin-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {
    ERC1155Upgradeable
} from "@openzeppelin-upgradeable/contracts/token/ERC1155/ERC1155Upgradeable.sol";
import {PrincipleFacet} from "./libraries/PrincipleFacet.sol";
import {IPrincipleAsset} from "./interfaces/IPrincipleAsset.sol";
import {IFundraise} from "./interfaces/IFundraise.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFundraiseFactory} from "./interfaces/IFundraiseFactory.sol";
import {IGuardFactory} from "./interfaces/IGuardFactory.sol";
import {IYieldToken} from "./interfaces/IYieldToken.sol";
import {IPrincipleGuard} from "./interfaces/IPrincipleGuard.sol";
import {
    INonfungiblePositionManager
} from "./interfaces/INonfungiblePositionManager.sol";
import {
    IERC1155Receiver
} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Events} from "./libraries/Events.sol";
import {Errors} from "./libraries/Errors.sol";
import {
    Position,
    PositionInput,
    PrincipleSupply,
    FeeType
} from "./libraries/Structs.sol";
import {LibPrincipleFacet} from "./libraries/LibPrincipleFacet.sol";
import {
    LiquidityAmounts
} from "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import {TickMath} from "./libraries/TickMath.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {console, Test} from "forge-std/Test.sol";

contract PrincipleToken is
    Initializable,
    OwnableUpgradeable,
    ERC1155Upgradeable,
    PrincipleFacet,
    IERC1155Receiver
{
    using LibPrincipleFacet for *;

    //immutable
    IPrincipleAsset public immutable principleAsset;
    IFundraiseFactory public immutable fundraiseFactory;
    IGuardFactory public immutable guardFactory;
    INonfungiblePositionManager public immutable positionManager;
    IERC20 public immutable settlement;
    uint16 public constant BPS = 10_000;

    address public admin;
    uint256 public tokenId;

    address public platformTreasury;
    mapping(uint256 => uint256) public accumulatedYieldPerToken;
    mapping(uint256 => mapping(address => uint256)) public yieldDebt;
    mapping(uint256 => uint256) public lastYieldDistribution;
    mapping(uint256 => uint256) public lastReport;

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Errors.NotAnAdmin();
        _;
    }
    /// @notice Initializes the contract with an admin owner
    /// @dev This function replaces the constructor for upgradeable contracts
    /// @dev Can only be called once due to the initializer modifier
    /// @param adminOwner The address that will be set as the owner of the contract

    function initialize(
        address adminOwner,
        address admin_,
        string memory uri
    ) public initializer {
        __Ownable_init(adminOwner);
        __ERC1155_init(uri);
        admin = admin_;
    }

    /// @notice Constructor that disables initializers
    /// @dev This prevents the implementation contract from being initialized
    /// @dev Required for upgradeable contracts to prevent initialization attacks
    constructor(
        address principleAsset_,
        address fundraiseFactory_,
        address settlement_,
        address guardFactory_,
        address _positionManager
    ) {
        principleAsset = IPrincipleAsset(principleAsset_);
        fundraiseFactory = IFundraiseFactory(fundraiseFactory_);
        settlement = IERC20(settlement_);
        guardFactory = IGuardFactory(guardFactory_);
        positionManager = INonfungiblePositionManager(_positionManager);
        _disableInitializers();
    }

    //erc721 mint
    function mintAsset(address to) external onlyAdmin {
        tokenId++;
        principleAsset.mint(to);

        emit Events.PrincipleAssetMinted(to, tokenId);
    }

    function setPlatformTreasury(address treasury_) external onlyOwner {
        platformTreasury = treasury_;
    }

    function registerProperty(
        string calldata metadataURI
    ) external returns (uint256) {
        tokenId++;
        principleAsset.mint(msg.sender);
        emit Events.PropertyRegistered(msg.sender, tokenId, metadataURI);
        return tokenId;
    }

    //fraction
    function mintPrinciple(PositionInput calldata input) external {
        if (
            IERC721(address(principleAsset)).ownerOf(input.tokenId) !=
            msg.sender
        ) revert Errors.UneligibleBalance();
        if (input.presaleAmount > 10_000) revert Errors.InvalidBPS();
        if (input.totalSupply == PrincipleSupply.NULL)
            revert Errors.InvalidPrincipleSupply();
        if (input.feeType == FeeType.YIELD_PERCENTAGE) {
            if (input.holderYieldBPS + input.baselineYieldBPS > 9700)
                revert Errors.InvalidBPS();
        } else {
            if (input.holderYieldBPS + input.baselineYieldBPS != 10000)
                revert Errors.InvalidBPS();
        }
        if (platformTreasury == address(0)) revert Errors.TreasuryNotSet();

        address pool = fundraiseFactory.deploy(msg.sender, input.tokenId);
        principleAsset.safeTransferFrom(msg.sender, pool, input.tokenId);

        uint256 mintAmount = setScaleAmount(input.totalSupply);
        uint256 presaleAmount = (input.presaleAmount * mintAmount) / BPS;
        uint256 timestamp = block.timestamp;
        uint256 platformFeeAmount = (mintAmount * 50) / BPS;

        _mint(platformTreasury, input.tokenId, platformFeeAmount, "");
        _mint(pool, input.tokenId, mintAmount - platformFeeAmount, "");

        LibPrincipleFacet.s().idToPosition[input.tokenId] = Position(
            msg.sender,
            input.tokenId,
            timestamp,
            input.deadline,
            pool,
            presaleAmount,
            mintAmount,
            input.presalePrice,
            address(0),
            address(0),
            input.holderYieldBPS,
            input.baselineYieldBPS,
            input.yieldPeriodSeconds,
            input.reportPeriodSeconds,
            input.feeType
        );

        emit Events.PlatformFeeMinted(
            platformTreasury,
            input.tokenId,
            platformFeeAmount
        );
        emit Events.PostionRegistered(
            msg.sender,
            input.tokenId,
            input.deadline,
            pool,
            presaleAmount,
            mintAmount
        );
    }

    function buyPresale(uint256 tokenId_, uint256 amount) external {
        // usd to pool
        Position storage position = LibPrincipleFacet.s().idToPosition[
            tokenId_
        ];
        if (position.pool == address(0)) revert Errors.PoolAddressIsZero();
        if (amount > position.presaleAmount) revert Errors.NotEnoughSupply();
        //if (position.expiry < block.timestamp) revert Errors.FinishedFundraise();
        if (amount == 0) revert Errors.AmountShouldNotBZero();
        settlement.transferFrom(
            msg.sender,
            position.pool,
            amount * position.presalePrice
        );
        // pool transfer NFT
        IFundraise(position.pool).transferPrincipleToken(msg.sender, amount);
        position.presaleAmount -= amount;

        emit Events.PresaleBought(tokenId_, amount, msg.sender);
    }

    //cover only when the price is above the BASE
    function sellPrinciple(uint256 tokenId_, uint256 amount) external {
        //id of principle guard
        Position storage position = LibPrincipleFacet.s().idToPosition[
            tokenId_
        ];
        //checker
        this.safeTransferFrom(msg.sender, address(this), tokenId_, amount, "");
        uint256 amountToSell = amount * position.presalePrice;
        uint256 floorTokenId = IPrincipleGuard(position.guard).floorTokenId();
        (, , , , , int24 tickLower, int24 tickUpper, , , , , ) = positionManager
            .positions(floorTokenId);
        uint160 sqrtRatioA = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtRatioB = TickMath.getSqrtRatioAtTick(tickUpper);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmount1(
            sqrtRatioA,
            sqrtRatioB,
            amountToSell
        );
        (, uint256 amount1) = IPrincipleGuard(position.guard)
            .decreaseLiquidityFromManager(floorTokenId, liquidity);
        settlement.transfer(msg.sender, amount1);
    }

    function deployGuard(
        string memory name_,
        string memory symbol_,
        uint256 tokenId_,
        uint160 sqrtPriceX96,
        int24 floorTick
    ) external {
        Position storage position = LibPrincipleFacet.s().idToPosition[
            tokenId_
        ];
        if (position.pool == address(0)) revert Errors.TokenIdIsNotExist();

        // Calculate fulfillment percentage based on total supply
        uint256 sold = position.totalSupply > position.presaleAmount
            ? position.totalSupply - position.presaleAmount
            : 0;
        uint256 fulfillment = (sold * 100) / position.totalSupply;

        // Allow deployment if:
        // 1. Matured (timestamp >= expiry)
        // 2. OR Presale is fully sold out
        // 3. OR Caller is owner (emergency/forced deployment)
        // 4. OR Caller is admin AND at least 50% of supply is sold
        bool isMatured = block.timestamp >= position.expiry;
        bool isFullySold = position.presaleAmount == 0;
        bool isOwner = msg.sender == owner();
        bool isAdmin50Percent = msg.sender == admin && fulfillment > 50;

        if (!isMatured && !isFullySold && !isOwner && !isAdmin50Percent) {
            revert Errors.NotYetMatured();
        }

        if (position.guard != address(0)) revert Errors.AlreadyDeployed();

        //deploy yield and guard
        address yieldToken = guardFactory.deployYieldToken(name_, symbol_);
        while (address(settlement) < yieldToken)
            yieldToken = guardFactory.deployYieldToken(name_, symbol_);
        address guardVault = guardFactory.deployGuard(yieldToken);
        IYieldToken(yieldToken).setBasePrice(guardVault);
        position.guard = guardVault;
        position.yieldToken = yieldToken;

        //initPool
        uint256 bal = settlement.balanceOf(position.pool);
        uint256 toOwner = Math.mulDiv(25, bal, 100);
        unchecked {
            bal = bal - toOwner;
        }
        uint256 anchor = (bal * 90) / 100;

        //transfer to owner
        IFundraise(position.pool).transferSettlement(position.owner, toOwner);
        IFundraise(position.pool).transferSettlement(guardVault, bal);
        if (address(settlement) < yieldToken) revert Errors.Irrelevant();
        IPrincipleGuard(guardVault).initPoolAndPosition(
            sqrtPriceX96,
            floorTick,
            bal - anchor,
            anchor
        );
        IPrincipleGuard(guardVault).setManager(address(this));
        IFundraise(position.pool).transferPrincipleAsset(position.owner);

        emit Events.PrincipleGuardDeployed(
            guardVault,
            yieldToken,
            floorTick,
            bal
        );
    }

    function distributeYield(uint256 tokenId_, uint256 amount) external {
        Position storage position = LibPrincipleFacet.s().idToPosition[
            tokenId_
        ];
        if (position.pool == address(0)) revert Errors.TokenIdIsNotExist();
        if (position.owner != msg.sender) revert Errors.NotPositionOwner();

        if (position.reportPeriodSeconds > 0 && lastReport[tokenId_] > 0) {
            if (
                block.timestamp >
                lastReport[tokenId_] + position.reportPeriodSeconds
            ) {
                revert Errors.ReportSLABreached();
            }
        }

        if (lastYieldDistribution[tokenId_] > 0) {
            if (
                block.timestamp <
                lastYieldDistribution[tokenId_] + position.yieldPeriodSeconds
            ) {
                revert Errors.YieldPeriodNotElapsed();
            }
        }

        settlement.transferFrom(msg.sender, address(this), amount);

        uint256 holderShare;
        uint256 baselineShare;
        uint256 platformShare;

        if (position.feeType == FeeType.YIELD_PERCENTAGE) {
            if (platformTreasury == address(0)) revert Errors.TreasuryNotSet();
            holderShare = (amount * position.holderYieldBPS) / BPS;
            platformShare =
                (amount *
                    (BPS -
                        position.holderYieldBPS -
                        position.baselineYieldBPS)) /
                BPS;
            baselineShare = amount - holderShare - platformShare;
            settlement.transfer(platformTreasury, platformShare);
        } else {
            holderShare = (amount * position.holderYieldBPS) / BPS;
            baselineShare = amount - holderShare;
            platformShare = 0;
        }

        if (baselineShare > 0 && position.guard != address(0)) {
            settlement.transfer(position.guard, baselineShare);
            IPrincipleGuard(position.guard).addToFloor(baselineShare);
        }

        if (holderShare > 0 && position.totalSupply > 0) {
            accumulatedYieldPerToken[tokenId_] +=
                (holderShare * 1e18) /
                position.totalSupply;
        }

        lastYieldDistribution[tokenId_] = block.timestamp;
        emit Events.YieldDistributed(
            tokenId_,
            holderShare,
            baselineShare,
            platformShare,
            block.timestamp
        );
    }

    function claimYield(uint256 tokenId_) external {
        Position storage position = LibPrincipleFacet.s().idToPosition[
            tokenId_
        ];
        if (position.pool == address(0)) revert Errors.TokenIdIsNotExist();

        uint256 accumulated = accumulatedYieldPerToken[tokenId_];
        uint256 debt = yieldDebt[tokenId_][msg.sender];
        uint256 balance = balanceOf(msg.sender, tokenId_);

        uint256 pending = ((accumulated - debt) * balance) / 1e18;
        yieldDebt[tokenId_][msg.sender] = accumulated;

        if (pending > 0) {
            settlement.transfer(msg.sender, pending);
        }
    }

    function acknowledgeReport(uint256 tokenId_) external {
        Position storage position = LibPrincipleFacet.s().idToPosition[
            tokenId_
        ];
        if (position.pool == address(0)) revert Errors.TokenIdIsNotExist();
        if (position.owner != msg.sender) revert Errors.NotPositionOwner();

        lastReport[tokenId_] = block.timestamp;
        emit Events.ReportAcknowledged(tokenId_, block.timestamp);
    }

    function setScaleAmount(
        PrincipleSupply supply
    ) internal returns (uint256 amount_) {
        if (supply == PrincipleSupply.FIRST) amount_ = 10_000;
        else if (supply == PrincipleSupply.SECOND) amount_ = 100_000;
        else return 0;

        emit Events.SupplySet(amount_);
    }

    /// @notice Handles the receipt of a single ERC1155 token type
    /// @return bytes4 The function selector to confirm the token transfer
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    /// @notice Handles the receipt of multiple ERC1155 token types
    /// @return bytes4 The function selector to confirm the token transfer
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    /// @notice Query if a contract implements an interface
    /// @param interfaceId The interface identifier, as specified in ERC-165
    /// @return bool True if the contract implements interfaceId, false otherwise
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155Upgradeable, IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
