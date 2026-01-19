import { formatUnits, parseEther } from "viem"

import PhantomOut from "../out/Phantom.sol/Phantom.json"
import { getV3Payload } from "./payload"
import { defaultAbiCoder } from "ethers/lib/utils"
import { BigNumber, ContractFactory, providers, Wallet } from "ethers"

const alchemyProvider = process.env["ALCHEMY_MAINNET"] ?? ""

const rpcProvider = new providers.JsonRpcProvider(alchemyProvider)

const wallet = Wallet.createRandom().connect(rpcProvider);

const simulation_factory = new ContractFactory(
    PhantomOut.abi,
    PhantomOut.bytecode.object,
    wallet
);

try {
    const first_router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        first_marketAddress = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
        first_markettype = "v2",
        second_router = "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        second_marketAddress = "0x7BeA39867e4169DBe237d55C8242a8f2fcDcc387",
        secondt_markettype = "v3";
    const optimalAmt = parseEther("1"),
        arbToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        swapToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

    const payload1 = defaultAbiCoder.encode(["bytes"], [0]),
        payload2 = await getV3Payload(swapToken, arbToken, 10000);

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

async function MessedUpPool() {
    const first_router = "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        first_marketAddress = "0x86d257cDB7bC9c0dF10E84C8709697F92770b335",
        first_markettype = "v3",
        second_router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        second_marketAddress = "0xc5be99A02C6857f9Eac67BbCE58DF5572498F40c",
        secondt_markettype = "v2";

    const v3_feeTier = 3000,
        optimalAmt = parseEther("1"),
        arbToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        swapToken = "0xD46bA6D942050d489DBd938a2C909A5d5039A161";

    const payload1 = await getV3Payload(arbToken, swapToken, v3_feeTier),
        payload2 = defaultAbiCoder.encode(["bytes"], [0]);

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

}

await MessedUpPool()


//             2025-06-27T12:57:47.212Z
//             CALCULATED -
//         Optimal input amount: 21.4376
//         Base profit: 4.9223
//         Profit minus flash loan fee: 4.9116
//         SIMULATED -
//         sim_profitMinusFee: 3963877391197344453575983046348115674221700746820753546310085938559764175103
//         sim_baseProfit: 3963877391197344453575983046348115674221700746820753546310096657406814800576
//         Net profit: 0
//         BlockNumber: 22795923
//         Current blocknumber: 22795923
//         pairHash: 0xf8794bcc915fa51c121e69f4c61c5997f14d1251891e68304a1eba569bed0750
// First swap Arb token to swap token
// uniV3 (0x86d257cDB7bC9c0dF10E84C8709697F92770b335)
// 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 => 0xD46bA6D942050d489DBd938a2C909A5d5039A161
// Than swap token to arb token back
// uniV2 (0xc5be99A02C6857f9Eac67BbCE58DF5572498F40c)
// 0xD46bA6D942050d489DBd938a2C909A5d5039A161 => 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
