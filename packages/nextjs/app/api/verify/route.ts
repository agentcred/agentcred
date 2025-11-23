import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, keccak256, stringToBytes } from "viem";
import { sapphireTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import deployedContracts from "~~/contracts/deployedContracts";

// This is a fake auditor account - in production, this would be the ROFL TEE
// For local testing, we'll use a hardhat account
const AUDITOR_PRIVATE_KEY = process.env.AUDITOR_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // hardhat account #0

export async function POST(req: NextRequest) {
    try {
        const { content, author, agentId } = await req.json();

        if (!content || !author || agentId === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: content, author, agentId" },
                { status: 400 }
            );
        }

        // Calculate content hash
        const contentHash = keccak256(stringToBytes(content));

        // Setup clients
        const publicClient = createPublicClient({
            chain: sapphireTestnet,
            transport: http(),
        });

        const account = privateKeyToAccount(AUDITOR_PRIVATE_KEY as `0x${string}`);
        const walletClient = createWalletClient({
            account,
            chain: sapphireTestnet,
            transport: http(),
        });

        // Get ContentRegistry contract
        const contentRegistryAddress = deployedContracts[sapphireTestnet.id].ContentRegistry.address as `0x${string}`;
        const contentRegistryAbi = deployedContracts[sapphireTestnet.id].ContentRegistry.abi;

        // 1. Publish content
        const uri = `data:text/plain;base64,${Buffer.from(content).toString("base64")}`;

        const publishHash = await walletClient.writeContract({
            address: contentRegistryAddress,
            abi: contentRegistryAbi,
            functionName: "publishContent",
            args: [contentHash, author as `0x${string}`, BigInt(agentId), uri],
        });

        await publicClient.waitForTransactionReceipt({ hash: publishHash });
        console.log(`Content published: ${contentHash}`);

        // 2. Call ROFL Agent for Verification
        // Prioritize env var, then local (for testing), then remote
        const ROFL_APP_URL = process.env.ROFL_APP_URL || "http://127.0.0.1:3001";
        console.log(`Calling ROFL agent at ${ROFL_APP_URL}/verify...`);

        let ok = false;
        let score = 0;

        try {
            const roflResponse = await fetch(`${ROFL_APP_URL}/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content }),
            });

            if (!roflResponse.ok) {
                throw new Error(`ROFL agent returned ${roflResponse.status}`);
            }

            const roflData = await roflResponse.json();
            ok = roflData.ok;
            score = roflData.score;
            console.log("ROFL Verdict:", roflData);

        } catch (error) {
            console.error("Failed to connect to ROFL agent:", error);
            // Fallback for demo/testing if ROFL is offline
            console.log("Falling back to local check...");
            if (!content.toLowerCase().includes("unsafe")) {
                ok = true;
                score = 80;
            }
        }

        // 3. Update audit result (Auditor Wallet submits the verdict)
        // In the future, the ROFL agent itself should sign this transaction via TEE
        const auditHash = await walletClient.writeContract({
            address: contentRegistryAddress,
            abi: contentRegistryAbi,
            functionName: "updateAuditResult",
            args: [contentHash, ok, BigInt(score)],
        });

        await publicClient.waitForTransactionReceipt({ hash: auditHash });
        console.log(`Audit completed: ok=${ok}, score=${score}`);

        // 4. Get updated content status
        const contentData = await publicClient.readContract({
            address: contentRegistryAddress,
            abi: contentRegistryAbi,
            functionName: "contents",
            args: [contentHash],
        }) as any;

        return NextResponse.json({
            success: true,
            contentHash,
            status: ["Pending", "Published", "AuditedOk", "AuditedFail"][Number(contentData.status)],
            score,
            ok,
            publishTxHash: publishHash,
            auditTxHash: auditHash,
        });

    } catch (error: any) {
        console.error("Error in /api/verify:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
