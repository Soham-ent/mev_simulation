import { Contract, ContractFactory, providers, Wallet } from "ethers";
import { defaultAbiCoder, formatUnits } from "ethers/lib/utils";
import PhantomOut from "../out/Phantom.sol/Phantom.json"
import { parseEther } from "viem";

const alchemyProvider = process.env["ALCHEMY_MAINNET"] ?? "",
    rpcProvider = new providers.JsonRpcProvider(alchemyProvider),
    wallet = Wallet.createRandom().connect(rpcProvider),
    simulation_factory = new ContractFactory(
        PhantomOut.abi,
        PhantomOut.bytecode.object,
        wallet
    );

const first_router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    first_marketAddress = "0x7D7E813082eF6c143277c71786e5bE626ec77b20",
    first_markettype = "v2",
    second_router = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    second_marketAddress = "0x1498bd576454159Bb81B5Ce532692a8752D163e8",
    secondt_markettype = "v2";

const optimalAmt = parseEther("1"),
    arbToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    swapToken = "0x9EA3b5b4EC044b70375236A281986106457b20EF";

const payload1 = defaultAbiCoder.encode(["bytes"], [0]),
    payload2 = payload1;

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
    uni_router = new Contract(
        second_router,
        routerAbi,
        rpcProvider
    );

/**
 * We will first swap 1 weth on sushi swap for delta token than 
 * swap those proceeds on uniswap for weth token back
 */
const amountOut_firstSwap = await sushi_router.callStatic.getAmountsOut(optimalAmt, [arbToken, swapToken]),
    amoutnOut_secondSwap = await uni_router.callStatic.getAmountsOut(amountOut_firstSwap[1], [swapToken, arbToken]);

console.log(`Cross market swap router output: ${formatUnits(amoutnOut_secondSwap[1], 18)}`)

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
    console.log(`Simulated output:${formatUnits(decoded, 18)} `)
} catch (error) {
    console.error(error)
}

