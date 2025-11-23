import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, keccak256, stringToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sapphireTestnet } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";

// This is a fake auditor account - in production, this would be the ROFL TEE
// For local testing, we'll use a hardhat account
const AUDITOR_PRIVATE_KEY =
    process.env.AUDITOR_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // hardhat account #0

export async function POST(req: NextRequest) {
    try {
        console.log("🔍 [VERIFY API] Starting verification process...");
        const { content, author, agentId } = await req.json();
        console.log(`📝 [VERIFY API] Request data: agentId=${agentId}, author=${author}, content length=${content?.length}`);

        if (!content || !author || agentId === undefined) {
            console.error("❌ [VERIFY API] Missing required fields");
            return NextResponse.json({ error: "Missing required fields: content, author, agentId" }, { status: 400 });
        }

        // Calculate content hash
        const contentHash = keccak256(stringToBytes(content));
        console.log(`🔐 [VERIFY API] Content hash calculated: ${contentHash}`);

        // Setup clients
        console.log("⚙️ [VERIFY API] Setting up blockchain clients...");
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
        console.log(`👛 [VERIFY API] Wallet client initialized with account: ${account.address}`);

        // Get ContentRegistry contract
        const contentRegistryAddress = deployedContracts[sapphireTestnet.id].ContentRegistry.address as `0x${string}`;
        const contentRegistryAbi = deployedContracts[sapphireTestnet.id].ContentRegistry.abi;
        console.log(`📄 [VERIFY API] ContentRegistry address: ${contentRegistryAddress}`);

        // 1. Publish content
        const uri = `data:text/plain;base64,${Buffer.from(content).toString("base64")}`;
        console.log("📤 [VERIFY API] Step 1: Publishing content to blockchain...");

        const publishHash = await walletClient.writeContract({
            address: contentRegistryAddress,
            abi: contentRegistryAbi,
            functionName: "publishContent",
            args: [contentHash, author as `0x${string}`, BigInt(agentId), uri],
        });
        console.log(`✅ [VERIFY API] Publish transaction submitted: ${publishHash}`);
        console.log("⏳ [VERIFY API] Waiting for publish transaction to be confirmed (timeout: 60s)...");

        await publicClient.waitForTransactionReceipt({ hash: publishHash, timeout: 60_000 });
        console.log(`✅ [VERIFY API] Content published successfully: ${contentHash}`);

        // 2. Server-side validation logic (simple keyword check)
        console.log("🔍 [VERIFY API] Step 2: Performing content validation...");
        let ok = true;
        let score = 100;

        if (content.toLowerCase().includes("unsafe")) {
            ok = false;
            score = 20;
            console.log("⚠️ [VERIFY API] Content contains 'unsafe' keyword - marked as failed");
        } else {
            console.log("✅ [VERIFY API] Content passed validation");
        }

        // 3. Update audit result (this triggers automatic slashing)
        console.log(`📋 [VERIFY API] Step 3: Updating audit result (ok=${ok}, score=${score})...`);
        const auditHash = await walletClient.writeContract({
            address: contentRegistryAddress,
            abi: contentRegistryAbi,
            functionName: "updateAuditResult",
            args: [contentHash, ok, BigInt(score)],
        });
        console.log(`✅ [VERIFY API] Audit transaction submitted: ${auditHash}`);
        console.log("⏳ [VERIFY API] Waiting for audit transaction to be confirmed (timeout: 60s)...");

        await publicClient.waitForTransactionReceipt({ hash: auditHash, timeout: 60_000 });
        console.log(`✅ [VERIFY API] Audit completed: ok=${ok}, score=${score}`);

        // 4. Update reputation scores
        console.log("📊 [VERIFY API] Step 4: Updating reputation scores...");
        const trustScoreRegistryAddress = deployedContracts[sapphireTestnet.id].TrustScoreRegistry?.address;
        const trustScoreRegistryAbi = deployedContracts[sapphireTestnet.id].TrustScoreRegistry?.abi;

        if (trustScoreRegistryAddress && trustScoreRegistryAbi) {
            // Calculate reputation deltas
            const userDelta = ok ? 1n : -1n;
            const agentDelta = ok ? 2n : -3n;
            console.log(`📈 [VERIFY API] Reputation deltas: User=${userDelta}, Agent=${agentDelta}`);

            // Update user reputation
            console.log("👤 [VERIFY API] Updating user reputation...");
            const userRepHash = await walletClient.writeContract({
                address: trustScoreRegistryAddress as `0x${string}`,
                abi: trustScoreRegistryAbi,
                functionName: "adjustUserReputation",
                args: [author, userDelta],
            });
            console.log(`✅ [VERIFY API] User reputation transaction submitted: ${userRepHash}`);

            // Update agent reputation
            console.log("🤖 [VERIFY API] Updating agent reputation...");
            const agentRepHash = await walletClient.writeContract({
                address: trustScoreRegistryAddress as `0x${string}`,
                abi: trustScoreRegistryAbi,
                functionName: "adjustAgentReputation",
                args: [BigInt(agentId), agentDelta],
            });
            console.log(`✅ [VERIFY API] Agent reputation transaction submitted: ${agentRepHash}`);

            console.log("⏳ [VERIFY API] Waiting for reputation transactions to be confirmed (timeout: 60s each)...");
            await Promise.all([
                publicClient.waitForTransactionReceipt({ hash: userRepHash, timeout: 60_000 }),
                publicClient.waitForTransactionReceipt({ hash: agentRepHash, timeout: 60_000 }),
            ]);
            console.log(`✅ [VERIFY API] Reputation updated: User ${userDelta}, Agent ${agentDelta}`);
        } else {
            console.warn("⚠️ [VERIFY API] TrustScoreRegistry not found, skipping reputation updates");
        }

        // 5. Get updated content status
        console.log("📖 [VERIFY API] Step 5: Reading final content status...");
        const contentData = (await publicClient.readContract({
            address: contentRegistryAddress,
            abi: contentRegistryAbi,
            functionName: "contents",
            args: [contentHash],
        })) as any;

        const response = {
            success: true,
            contentHash,
            status: ["Pending", "Published", "AuditedOk", "AuditedFail"][Number(contentData.status)],
            score,
            ok,
            publishTxHash: publishHash,
            auditTxHash: auditHash,
        };
        console.log("🎉 [VERIFY API] Verification complete:", response);

        return NextResponse.json(response);
    } catch (error: any) {
        console.error("❌ [VERIFY API] Error in /api/verify:", error);
        console.error("❌ [VERIFY API] Error details:", {
            message: error.message,
            name: error.name,
            stack: error.stack,
        });
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
