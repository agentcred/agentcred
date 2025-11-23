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
    const { content, author, agentId } = await req.json();

    if (!content || !author || agentId === undefined) {
      return NextResponse.json({ error: "Missing required fields: content, author, agentId" }, { status: 400 });
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

    // 2. Verification is now asynchronous via ROFL agent polling
    // The frontend should poll the contract or listen for events to see the result
    console.log("Content published. Waiting for ROFL agent to verify...");

    return NextResponse.json({
      success: true,
      contentHash,
      status: "Pending",
      score: 0,
      ok: false,
      publishTxHash: publishHash,
      message: "Content published. Verification pending.",
    });

    return NextResponse.json({
      success: true,
      contentHash,
      status: "Pending",
      publishTxHash: publishHash,
      message: "Content published. Verification pending.",
    });
  } catch (error: any) {
    console.error("Error in /api/verify:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
