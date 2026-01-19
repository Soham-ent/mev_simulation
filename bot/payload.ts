import { BigNumber } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import {
    PublicClient,
    encodeFunctionData,
    parseAbi
} from "viem";

// --- ABIs (Simplified for readability, you can import yours) ---
const V2_ROUTER_ABI = parseAbi([
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
]);

const V3_ROUTER_ABI = parseAbi([
    'struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }',
    'function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut)'
]);

export async function getV2Payload(
    client: PublicClient,
    recipient: `0x${string}`,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: bigint,
    slippagePercent: number = 0.5 // 0.5%
) {
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        path = [tokenIn, tokenOut],
        currentTimestamp = Math.floor(Date.now() / 1000),
        deadline = BigInt(currentTimestamp + 60 * 20); // 20 minutes from now

    // 1. Fetch expected output amount from the Router (Read Call)
    // Note: getAmountsOut returns an array [amountIn, amountOut]
    const amounts = await client.readContract({
        address: routerAddress,
        abi: V2_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path]
    });

    console.log(amounts)

    const amountOutRaw = amounts[1];

    // 2. Calculate Minimum Amount Out (Slippage protection)
    // Formula: amountOut * (1 - slippage)
    const amountOutMin = amountOutRaw * BigInt((100 - slippagePercent) * 100) / 10000n;

    // 3. Generate the Payload (Calldata)
    // This is the equivalent of populateTransaction
    const data = encodeFunctionData({
        abi: V2_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
            amountIn,
            amountOutMin,
            path,
            recipient,
            deadline
        ]
    });

    return {
        to: routerAddress,
        data: data,
        value: 0n // V2 Router swaps for ERC20s don't require ETH value
    };
}

const MIN_SQRT_RATIO = 4295128739n,
    MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

export async function getV3Payload(
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    feeTier: number, // e.g., 3000 for 0.3%
) {
    const currentTimestamp = Math.floor(Date.now() / 1000),
        deadline = BigInt(currentTimestamp + 60 * 20);

    // Sort tokens to determine direction (Uniswap logic)
    // Note: In V3, 'zeroForOne' depends on whether you are swapping token0 -> token1.
    // Ensure you know which is token0 (smaller address) vs token1.
    // If tokenIn < tokenOut, tokenIn is token0, so we are swapping 0 -> 1 (zeroForOne = true)
    const isZeroForOne = tokenIn.toLowerCase() < tokenOut.toLowerCase(),
        sqrtPriceLimitX96 = isZeroForOne ?
            BigNumber.from(MIN_SQRT_RATIO).add(1) :
            BigNumber.from(MAX_SQRT_RATIO).sub(1);

    // 1. Prepare Params (Tuple)
    // VIEM FIX: This must be an ordered array, not an object.
    const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        deadline: deadline,
        amountOutMinimum: BigNumber.from(0),
        sqrtPriceLimitX96: sqrtPriceLimitX96,
        fee: feeTier
    },
        v3ParamsEncoded = defaultAbiCoder.encode(
            [
                'tuple(address tokenIn, address tokenOut, uint256 deadline, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96, uint24 fee)'
            ],
            [params]
        );

    return v3ParamsEncoded
}