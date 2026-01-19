import { createPublicClient, decodeAbiParameters, encodeDeployData, http, parseAbiParameters } from "viem";
import { mainnet } from "viem/chains";

import FreeENSOut from "../out/FreeENS.sol/FreeENS.json";

const alchemyProvider = process.env["ALCHEMY_MAINNET"] ?? ""

// Initialize the client (provider)
const client = createPublicClient({
    chain: mainnet,
    transport: http(alchemyProvider)
})

try {
    const ADDRESS_WITH_ENS = [
        "0x8858Ea3b4080bCf6d7B6f5189daE9d8914027Bd0",
        "0x57001BD30496045ACb1E9bBd507440b301C1d9E3",
        "0x60516a59443acc6635B1c952544337De7Cb70eb1",
        "0x2536c09E5F5691498805884fa37811Be3b2BDdb4",
        "0x1a0aF84ef9f0A5e60967C319B03DcA9a9221bde5"
    ];

    // --- 2. Encode Deployment Data ---
    const deployData = encodeDeployData({
        abi: FreeENSOut.abi,
        bytecode: FreeENSOut.bytecode.object as `0x${string}`,
        args: [ADDRESS_WITH_ENS]
    });

    // --- 3. Execute eth_call ---
    const { data } = await client.call({
        data: deployData
    })

    if (!data) throw new Error("Ens returned no data (revert?)");

    const abiParams = parseAbiParameters("string[]"),
        // decode data, viem returns an array of arguments, so we destructure the first element
        // Format it back
        [ensDomains] = decodeAbiParameters(
            abiParams,
            data
        );

    // 3. Log it (Same as before)
    ensDomains.forEach((x, idx) => {
        console.log(`${ADDRESS_WITH_ENS[idx]} => ${x}`);
    });
} catch (error) {
    console.error(error)
}