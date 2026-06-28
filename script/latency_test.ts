import { Contract, providers } from "ethers";
import v2Pools from "./abis/v2Pools.json"
import { Interface } from "ethers/lib/utils";
import multicallAbi from "./abis/Multicall_2.json"

const localHostProvider = new providers.JsonRpcProvider("http://127.0.0.1:8545");

// Mainnet contracts
const multicall2 = new Contract(
    "0x9695FA23b27022c7DD752B7d64bB5900677ECC21",
    multicallAbi,
    localHostProvider
);

const iFace = new Interface(["function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"])

const callData = v2Pools.map(pool => {
    return {
        target: pool,
        allowFailure: false,
        callData: iFace.encodeFunctionData("getReserves", []) // Market address
    }
})

const start0 = performance.now()
await multicall2.callStatic.tryAggregate(
    false,
    callData
)
console.log(`Time take from self node call: ${(performance.now() - start0).toFixed(2)}`)

const alchemyProvider = new providers.JsonRpcProvider("https://eth-mainnet.g.alchemy.com/v2/<--paste-your-alchemy-key-->");

const multicall2_alchemy = new Contract(
    "0x9695FA23b27022c7DD752B7d64bB5900677ECC21",
    multicallAbi,
    alchemyProvider
);

const start1 = performance.now()
await multicall2_alchemy.callStatic.tryAggregate(
    false,
    callData
)
console.log(`Time take for ext call alchemy: ${(performance.now() - start1).toFixed(2)}`)

const infuraProvider = new providers.JsonRpcProvider("https://mainnet.infura.io/v3/<--paste-your-infura-key-->")

const multicall2_infura = new Contract(
    "0x9695FA23b27022c7DD752B7d64bB5900677ECC21",
    multicallAbi,
    infuraProvider
);

const start2 = performance.now()
await multicall2_infura.callStatic.tryAggregate(
    false,
    callData
)
console.log(`Time take for ext call infura: ${(performance.now() - start2).toFixed(2)}`)

const chainstackProvider = new providers.JsonRpcProvider("https://ethereum-mainnet.core.chainstack.com/<--paste-your-chainstack-key-->")

const multicall2_chainstack = new Contract(
    "0x9695FA23b27022c7DD752B7d64bB5900677ECC21",
    multicallAbi,
    chainstackProvider
);

const start3 = performance.now()
await multicall2_chainstack.callStatic.tryAggregate(
    false,
    callData
)
console.log(`Time take for ext call chainStack: ${(performance.now() - start3).toFixed(2)}`)

