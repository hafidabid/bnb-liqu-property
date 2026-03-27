// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Errors} from "../libraries/Errors.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {RouterInput} from "../libraries/Structs.sol";
import {TickMath} from "../libraries/TickMath.sol";
import {ISwapRouter02} from "../interfaces/ISwapRouter02.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract PrincipleRouter is Initializable {
    using SafeERC20 for IERC20;

    ISwapRouter02 public immutable swapRouter;
    address public immutable usdc;
    uint24 public constant FEE_TIER = 3000;

    modifier checkDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert Errors.DeadlineExceeded();
        _;
    }

    function initialize() public initializer {}

    constructor(address router_, address usdc_) {
        usdc = usdc_;
        swapRouter = ISwapRouter02(router_);
    }

    function swap(RouterInput calldata params) external checkDeadline(params.deadline) {
        address tokenIn = params.zeroForOne ? params.token0 : usdc;
        address tokenOut = tokenIn == usdc ? params.token0 : usdc;
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        IERC20(tokenIn).approve(address(swapRouter), params.amountIn);

        ISwapRouter02.ExactInputSingleParams memory swap_ = ISwapRouter02.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: FEE_TIER,
            recipient: msg.sender,
            amountIn: params.amountIn,
            amountOutMinimum: params.amountOut,
            sqrtPriceLimitX96: 0
        });

        swapRouter.exactInputSingle(swap_);
    }
}
