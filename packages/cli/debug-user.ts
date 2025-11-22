import { createPublicClient, http, keccak256, toBytes, stringToBytes } from "viem";
import { hardhat } from "viem/chains";
import * as dotenv from "dotenv";
// @ts-ignore
import deployedContracts from "./deployedContracts";

dotenv.config();

const CHAIN_ID = 31337;
const RPC_URL = "http://127.0.0.1:8545";
const TARGET_USER = "0x2D3bE626d83498437AA6b8CEEdeEa72f04c5591c";

const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
});

async function debug() {
    console.log("Debugging user:", TARGET_USER);

    const contracts = deployedContracts[CHAIN_ID];
    const contentRegistry = contracts.ContentRegistry;
    const identityRegistry = contracts.IdentityRegistry;

    // 1. Get Agent ID
    console.log("\n1. Checking Agents...");
    const balance = await publicClient.readContract({
        address: identityRegistry.address as `0x${string}`,
        abi: identityRegistry.abi,
        functionName: "balanceOf",
        args: [TARGET_USER],
    }) as bigint;

    console.log("Agent Balance:", balance.toString());

    if (balance === 0n) {
        console.log("No agents found.");
        return;
    }

    // Assuming first agent
    // Note: IdentityRegistry doesn't have tokenOfOwnerByIndex by default usually unless Enumerable.
    // Let's try to find Transfer events to find the ID.
    const transferLogs = await publicClient.getLogs({
        address: identityRegistry.address as `0x${string}`,
        event: {
            type: "event",
            name: "Transfer",
            inputs: [
                { indexed: true, name: "from", type: "address" },
                { indexed: true, name: "to", type: "address" },
                { indexed: true, name: "tokenId", type: "uint256" },
            ],
        },
        args: {
            to: TARGET_USER,
        },
        fromBlock: 0n,
    });

    if (transferLogs.length === 0) {
        console.log("No Transfer events found for user.");
        return;
    }

    const agentId = transferLogs[0].args.tokenId;
    console.log("Found Agent ID:", agentId?.toString());

    // 2. Get Published Content
    console.log("\n2. Checking Published Content...");
    const publishedLogs = await publicClient.getLogs({
        address: contentRegistry.address as `0x${string}`,
        event: {
            type: "event",
            name: "ContentPublished",
            inputs: [
                { indexed: false, name: "contentHash", type: "string" },
                { indexed: true, name: "author", type: "address" },
                { indexed: true, name: "agentId", type: "uint256" },
                { indexed: false, name: "uri", type: "string" },
            ],
        },
        args: {
            agentId: agentId,
        },
        fromBlock: 0n,
    });

    console.log(`Found ${publishedLogs.length} published items.`);

    const contentHashMap = new Map<string, string>();

    publishedLogs.forEach(log => {
        const contentHash = log.args.contentHash;
        if (contentHash) {
            const hash = keccak256(stringToBytes(contentHash));
            console.log(`- Content: "${contentHash}"`);
            console.log(`  Hash: ${hash}`);
            contentHashMap.set(hash, contentHash);
        }
    });

    // 3. Get Audited Content
    console.log("\n3. Checking Audited Content...");
    const auditedLogs = await publicClient.getLogs({
        address: contentRegistry.address as `0x${string}`,
        event: {
            type: "event",
            name: "ContentAudited",
            inputs: [
                { indexed: true, name: "contentHash", type: "string" },
                { indexed: false, name: "ok", type: "bool" },
                { indexed: false, name: "score", type: "uint256" },
            ],
        },
        fromBlock: 0n,
    });

    console.log(`Found ${auditedLogs.length} total audit events.`);

    let matchCount = 0;
    auditedLogs.forEach(log => {
        const eventHash = log.args.contentHash;
        console.log(`- Audit Event Hash: ${eventHash}`);

        if (eventHash && contentHashMap.has(eventHash)) {
            const original = contentHashMap.get(eventHash);
            console.log(`  MATCH! -> "${original}" (OK: ${log.args.ok})`);
            matchCount++;
        } else {
            console.log(`  NO MATCH`);
        }
    });

    console.log(`\nTotal Matches: ${matchCount}`);

    // 4. Check Reputation
    console.log("\n4. Checking Reputation...");
    const trustScoreRegistry = contracts.TrustScoreRegistry;

    try {
        const currentRep = await publicClient.readContract({
            address: trustScoreRegistry.address as `0x${string}`,
            abi: trustScoreRegistry.abi,
            functionName: "getAgentReputation",
            args: [agentId || 0n],
        });
        console.log(`Current Reputation (Contract): ${currentRep}`);
    } catch (e: any) {
        console.log("Error reading reputation:", e.message);
    }

    const repLogs = await publicClient.getLogs({
        address: trustScoreRegistry.address as `0x${string}`,
        event: {
            type: "event",
            name: "AgentReputationUpdated",
            inputs: [
                { indexed: true, name: "agentId", type: "uint256" },
                { indexed: false, name: "newScore", type: "int256" },
                { indexed: false, name: "delta", type: "int256" },
            ],
        },
        args: {
            agentId: agentId,
        },
        fromBlock: 0n,
    });

    console.log(`Found ${repLogs.length} reputation update events.`);
    repLogs.forEach(log => {
        console.log(`- Block ${log.blockNumber}: New Score ${log.args.newScore}, Delta ${log.args.delta}`);
    });
}

debug().catch(console.error);
