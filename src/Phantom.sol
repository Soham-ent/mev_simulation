// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IERC20.sol";

interface IUniswapV2Pair {
    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;
}

interface IUniswapV3PoolActions {
    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);
}

interface IUniswapV3Pool is IUniswapV3PoolActions {}

interface IUniswapV2Router01 {
    function factory() external pure returns (address);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) external pure returns (uint amountOut);
    function getAmountIn(
        uint amountOut,
        uint reserveIn,
        uint reserveOut
    ) external pure returns (uint amountIn);
    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
    function getAmountsIn(
        uint amountOut,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}

interface IUniswapV2Router02 is IUniswapV2Router01 {}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another token
    /// @param params The parameters necessary for the swap, encoded as `ExactInputSingleParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another along the specified path
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactInputParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInput(
        ExactInputParams calldata params
    ) external payable returns (uint256 amountOut);
}

interface IWETH is IERC20 {
    function deposit() external payable;
}

library SafeTransferLib {
    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        bool success;

        /// @solidity memory-safe-assembly
        assembly {
            // Get a pointer to some free memory.
            let freeMemoryPointer := mload(0x40)

            // Write the abi-encoded calldata into memory, beginning with the function selector.
            mstore(
                freeMemoryPointer,
                0xa9059cbb00000000000000000000000000000000000000000000000000000000
            )
            mstore(
                add(freeMemoryPointer, 4),
                and(to, 0xffffffffffffffffffffffffffffffffffffffff)
            ) // Append and mask the "to" argument.
            mstore(add(freeMemoryPointer, 36), amount) // Append the "amount" argument. Masking not required as it's a full 32 byte type.

            success := and(
                // Set success to whether the call reverted, if not we check it either
                // returned exactly 1 (can't just be non-zero data), or had no return data.
                or(
                    and(eq(mload(0), 1), gt(returndatasize(), 31)),
                    iszero(returndatasize())
                ),
                // We use 68 because the length of our calldata totals up like so: 4 + 32 * 2.
                // We use 0 and 32 to copy up to 32 bytes of return data into the scratch space.
                // Counterintuitively, this call must be positioned second to the or() call in the
                // surrounding and() call or else returndatasize() will be zero during the computation.
                call(gas(), token, 0, freeMemoryPointer, 68, 0, 32)
            )
        }

        require(success, "TRANSFER_FAILED");
    }

    function safeApprove(IERC20 token, address to, uint256 amount) internal {
        bool success;

        /// @solidity memory-safe-assembly
        assembly {
            // Get a pointer to some free memory.
            let freeMemoryPointer := mload(0x40)

            // Write the abi-encoded calldata into memory, beginning with the function selector.
            mstore(
                freeMemoryPointer,
                0x095ea7b300000000000000000000000000000000000000000000000000000000
            )
            mstore(
                add(freeMemoryPointer, 4),
                and(to, 0xffffffffffffffffffffffffffffffffffffffff)
            ) // Append and mask the "to" argument.
            mstore(add(freeMemoryPointer, 36), amount) // Append the "amount" argument. Masking not required as it's a full 32 byte type.

            success := and(
                // Set success to whether the call reverted, if not we check it either
                // returned exactly 1 (can't just be non-zero data), or had no return data.
                or(
                    and(eq(mload(0), 1), gt(returndatasize(), 31)),
                    iszero(returndatasize())
                ),
                // We use 68 because the length of our calldata totals up like so: 4 + 32 * 2.
                // We use 0 and 32 to copy up to 32 bytes of return data into the scratch space.
                // Counterintuitively, this call must be positioned second to the or() call in the
                // surrounding and() call or else returndatasize() will be zero during the computation.
                call(gas(), token, 0, freeMemoryPointer, 68, 0, 32)
            )
        }

        require(success, "APPROVE_FAILED");
    }
}

library SafeCast {
    /// @notice Cast a uint256 to a int256, revert on overflow
    /// @param y The uint256 to be casted
    /// @return z The casted integer, now type int256
    function toInt256(uint256 y) internal pure returns (int256 z) {
        require(y < 2 ** 255);
        z = int256(y);
    }
}

contract Phantom {
    using SafeTransferLib for IERC20;
    using SafeTransferLib for IWETH;
    using SafeCast for uint256;

    IWETH weth9 = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    struct v3Params {
        address tokenIn;
        address tokenOut;
        uint256 deadline;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
        uint24 fee;
    }

    struct PoolPayload {
        bytes payload; // 0 for v2 and contain for v3
        address[] path;
        address routerAddress;
        address pool;
        string _type; // v2 or v3
    }

    function _v2Swap(
        address[] memory path,
        address recipient,
        address routerAddr,
        address pool,
        uint256 optimalAmt
    ) internal returns (uint256 amtFromSwap) {
        IUniswapV2Router02 router = IUniswapV2Router02(routerAddr);
        uint256 amtToBuy = router.getAmountsOut(optimalAmt, path)[1];

        uint256 initialBalance = IERC20(path[1]).balanceOf(recipient);

        // Calculate amounts based on token order
        (uint amount0Out, uint amount1Out) = path[0] < path[1]
            ? (uint(0), amtToBuy)
            : (amtToBuy, uint(0));

        IUniswapV2Pair(pool).swap(
            amount0Out,
            amount1Out,
            recipient,
            new bytes(0)
        );

        amtFromSwap = IERC20(path[1]).balanceOf(recipient) - initialBalance;

        require(
            amtFromSwap >= amtToBuy,
            "Unexpected swap result: received less than expected"
        );
    }

    function _v3Swap(
        bytes memory payload,
        address recipient,
        address routerAddr,
        uint256 amtIn
    ) internal returns (uint256 amtFromSwap) {
        v3Params memory v3params = abi.decode(payload, (v3Params));
        address tokenIn = v3params.tokenIn;
        IERC20(tokenIn).safeApprove(routerAddr, amtIn);

        ISwapRouter router = ISwapRouter(routerAddr);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: v3params.tokenOut,
                fee: v3params.fee,
                recipient: recipient,
                deadline: v3params.deadline,
                amountIn: amtIn,
                amountOutMinimum: v3params.amountOutMinimum,
                sqrtPriceLimitX96: v3params.sqrtPriceLimitX96
            });

        amtFromSwap = router.exactInputSingle(params);
    }

    constructor(
        PoolPayload[] memory poolPayloads,
        uint256 _optimalAmt
    ) payable {
        {
            PoolPayload memory firstMarket = poolPayloads[0];
            address pool = firstMarket.pool;
            weth9.deposit{value: msg.value}();
            if (keccak256(bytes(firstMarket._type)) == keccak256("v2")) {
                // Transfer initial WETH to the first pool
                weth9.safeTransfer(pool, _optimalAmt);
            }
        }

        {
            uint256 poolLen = poolPayloads.length;
            for (uint i = 0; i < poolLen; i++) {
                PoolPayload memory poolPayload = poolPayloads[i];
                address[] memory buyPath = poolPayload.path;
                address routerAddr = poolPayload.routerAddress;
                address pool = poolPayload.pool;
                address recipient;

                // Determine the recipient: either the next pool or this contract
                if (i == poolLen - 1) {
                    recipient = address(this);
                } else {
                    if (
                        keccak256(bytes(poolPayloads[i + 1]._type)) ==
                        keccak256("v3")
                    ) {
                        recipient = address(this);
                    } else {
                        recipient = poolPayloads[i + 1].pool;
                    }
                }

                if (keccak256(bytes(poolPayload._type)) == keccak256("v2")) {
                    // Perform the swap
                    _optimalAmt = _v2Swap(
                        buyPath,
                        recipient,
                        routerAddr,
                        pool,
                        _optimalAmt
                    );
                } else {
                    _optimalAmt = _v3Swap(
                        poolPayload.payload,
                        recipient,
                        routerAddr,
                        _optimalAmt
                    );
                }
            }
        }

        // insure abi encoding, not needed here but increase reusability for different return types
        // note: abi.encode add a first 32 bytes word with the address of the original data
        bytes memory _abiEncodedData = abi.encode(_optimalAmt);
        uint256 length = _abiEncodedData.length;

        assembly {
            // Return from the start of the data (discarding the original data address)
            // up to the end of the memory used
            let dataStart := add(_abiEncodedData, 0x20)
            return(dataStart, length) //  sub(msize(), dataStart)
        }
    }
}
