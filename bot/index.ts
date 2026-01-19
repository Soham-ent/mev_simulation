import fs from "fs"
import path from "path"
import { mainnet } from "viem/chains"
import { createPublicClient, http, hexToBigInt } from "viem"

const alchemyProvider = process.env["ALCHEMY_MAINNET"] ?? ""

// Initialize the client (provider)
const client = createPublicClient({
    chain: mainnet,
    transport: http(alchemyProvider),
    batch: { multicall: true }
})

// Fetch block number 
const currentBlock = await client.getBlockNumber();
console.log(`Simulation on block: ${currentBlock}`)

// 1. Load the compiled artifact from foundry
const artifactPath = path.resolve(__dirname, "../out/Phantom.sol/Phantom.json"),
    artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8")),
    phantomBytecode = artifact.bytecode.object as `0x${string}`;

console.log("Loaded Phantom Bytecode:", phantomBytecode.slice(0, 50) + "...");