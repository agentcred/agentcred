import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, keccak256, stringToBytes } from "viem";
import { hardhat } from "viem/chains";
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
            chain: hardhat,
            transport: http(),
        });

        const account = privateKeyToAccount(AUDITOR_PRIVATE_KEY as `0x${string}`);
        const walletClient = createWalletClient({
            account,
            chain: hardhat,
            transport: http(),
        });

        // Get ContentRegistry contract
        const contentRegistryAddress = deployedContracts[hardhat.id].ContentRegistry.address as `0x${string}`;
        const contentRegistryAbi = deployedContracts[hardhat.id].ContentRegistry.abi;

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

        // 2. Fake Auditor Logic
        let ok = true;
        let score = 100;

        if (content.toLowerCase().includes("unsafe")) {
            ok = false;
            score = 20;
        }

        // 3. Update audit result (this triggers automatic slashing and reputation updates)
        const auditHash = await walletClient.writeContract({
            address: contentRegistryAddress,
            abi: contentRegistryAbi,
            functionName: "updateAuditResult",
            args: [contentHash, ok, score],
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
