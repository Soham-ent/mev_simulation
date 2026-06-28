import { formatUnits, parseEther } from "viem"
import v3QuoterAbi from "./abis/UniswapV3QuoterV2.json"
import PhantomOut from "../out/Phantom.sol/Phantom.json"
import { getV3Payload } from "./payload"
import { defaultAbiCoder } from "ethers/lib/utils"
import { BigNumber, Contract, ContractFactory, providers, Wallet } from "ethers"

const alchemyProvider = process.env["ALCHEMY_MAINNET"] ?? "",
    rpcProvider = new providers.JsonRpcProvider(alchemyProvider),
    wallet = Wallet.createRandom().connect(rpcProvider),
    simulation_factory = new ContractFactory(
        PhantomOut.abi,
        PhantomOut.bytecode.object,
        wallet
    );

const first_router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    first_marketAddress = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
    first_markettype = "v2",
    second_router = "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    second_marketAddress = "0x7BeA39867e4169DBe237d55C8242a8f2fcDcc387",
    secondt_markettype = "v3",
    v3FeeTier = 10000;

const optimalAmt = parseEther("1"),
    arbToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    swapToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const payload1 = defaultAbiCoder.encode(["bytes"], [0]),
    payload2 = await getV3Payload(swapToken, arbToken, v3FeeTier);

const genPayloads = [
    [
        payload1,
        [arbToken, swapToken],
        first_router,
        first_marketAddress,
        first_markettype
    ],
    [
        payload2,
        [swapToken, arbToken],
        second_router,
        second_marketAddress,
        secondt_markettype
    ]
];

const routerAbi = [
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
],
    sushi_router = new Contract(
        first_router,
        routerAbi,
        rpcProvider
    ),
    uni_quoter = new Contract(
        "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
        v3QuoterAbi,
        rpcProvider
    );

const amountOut_firstSwap = await sushi_router.callStatic.getAmountsOut(optimalAmt, [arbToken, swapToken]),
    amoutnOut_secondSwap = await uni_quoter.callStatic.quoteExactInputSingle([swapToken, arbToken, amountOut_firstSwap[1], v3FeeTier, 0]);

console.log(`Cross market swap router output: ${formatUnits(amoutnOut_secondSwap[0], 18)}`)

try {
    const { data } = simulation_factory.getDeployTransaction(
        genPayloads,
        optimalAmt
    )
    const retResultE = await rpcProvider.call({
        data,
        value: BigInt(1000e18)
    })

    // @ts-ignore
    const [decoded]: Array<BigNumber> = defaultAbiCoder.decode(["uint256"], retResultE)
    // @ts-ignore
    console.log(`Simulated output:${formatUnits(decoded, 18)}`)
} catch (error) {
    console.error(error)
}
