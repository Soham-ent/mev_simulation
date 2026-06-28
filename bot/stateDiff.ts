import v3QuoterAbi from "./abis/UniswapV3QuoterV2.json"
import PhantomV2 from "../out/PhantomV2.sol/PhantomV2.json"
import { getV3Payload } from "./payload"
import { defaultAbiCoder, formatUnits, parseUnits } from "ethers/lib/utils"
import { BigNumber, Contract, ContractFactory, providers, utils, Wallet } from "ethers"

const alchemyProvider = process.env["ALCHEMY_MAINNET"] ?? "",
    rpc = new providers.JsonRpcProvider(alchemyProvider),
    authKeyWallet = Wallet.createRandom().connect(rpc);

const first_router = "0x2E6cd2d30aa43f40aa81619ff4b6E0a41479B13F",
    first_marketAddress = "0x769DB46F39C42ee7AD5f71F4167c47EdD281E767",
    first_markettype = "v3",
    first_feeTier = 3000,
    second_router = "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    second_marketAddress = "0x60594a405d53811d3BC4766596EFD80fd545A270",
    second_markettype = "v3",
    second_feeTier = 500;

const optimalAmt = parseUnits("1000", 18),
    dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const payload1 = await getV3Payload(dai, weth, first_feeTier),
    payload2 = await getV3Payload(weth, dai, second_feeTier);

const genPayloads = [
    [
        payload1,
        [dai, weth],
        first_router,
        first_marketAddress,
        first_markettype
    ],
    [
        payload2,
        [weth, dai],
        second_router,
        second_marketAddress,
        second_markettype
    ]
];

const sushi_quoter = new Contract(
    "0x64e8802fe490fa7cc61d3463958199161bb608a7",
    v3QuoterAbi, // Sushi and uni quoter are same
    rpc
),
    uni_quoter = new Contract(
        "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
        v3QuoterAbi,
        rpc
    );

const amountOut_firstSwap = await sushi_quoter.callStatic.quoteExactInputSingle([dai, weth, optimalAmt, first_feeTier, 0]),
    amoutnOut_secondSwap = await uni_quoter.callStatic.quoteExactInputSingle([weth, dai, amountOut_firstSwap[0], second_feeTier, 0]);

console.log(`Off-chain calculated output: ${formatUnits(amoutnOut_secondSwap[0], 18)}`)

/**
 * For state diff to work we know the deployed contract address.
 * Because without that we cannot indicate the EVM that which wallet balance
 * we want to modify
 */
const deployerNonce = await rpc.getTransactionCount(authKeyWallet.address),
    predictedAddress = utils.getContractAddress({
        from: authKeyWallet.address,
        nonce: deployerNonce
    });

const daiBalanceSlot = 2; // Slot 2 is balanceOf in the MakerDAO DAI contract

/**
 * Derive the exact storage slot for our predicted address, mirrors 
 * EVM memory packing exactly order matters.
 */
const slotIndex = utils.keccak256(
    defaultAbiCoder.encode(
        ["uint256", "uint256"],
        [predictedAddress, daiBalanceSlot]
    )
)

// Define the fake balance we want to inject (e., 1000 DAI)
const injectedAmount = optimalAmt,
    injectedAmountHex = utils.hexZeroPad(injectedAmount.toHexString(), 32);

// Construct the final stateDiff object
const stateOverrides = {
    [dai]: {
        stateDiff: {
            [slotIndex]: injectedAmountHex
        }
    }
}


const simulation_factory = new ContractFactory(
    PhantomV2.abi,
    PhantomV2.bytecode.object,
    authKeyWallet
)

try {
    const { data } = simulation_factory.getDeployTransaction(
        genPayloads,
        optimalAmt
    ),
        txParams = {
            from: authKeyWallet.address,
            data: data
            /**
             * Notice we REMOVED value: BigInt(1000e18) 
             * We no longer need native ETH because we are directly injecting DAI
             */
        },
        retResultE = await rpc.send("eth_call", [
            txParams,
            "latest", // Or a specific historical hex block number
            stateOverrides
        ]);

    const [decoded] = defaultAbiCoder.decode(["uint256"], retResultE);
    console.log(`On-chain simulation output: ${formatUnits(decoded, 18)}`)
} catch (error) {
    console.error("Error occured while simulating tx")
}