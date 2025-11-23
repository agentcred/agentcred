import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { useTargetNetwork } from "../scaffold-eth";
import { contracts } from "~~/utils/scaffold-eth/contract";
import { keccak256, toBytes, stringToBytes } from "viem";
import { fetchLogsWithChunking } from "~~/utils/fetchLogsWithChunking";

export interface AgentEvent {
    type: "published" | "audited" | "slashed" | "reputation";
    timestamp: number;
    blockNumber: bigint;
    transactionHash: string;
    data: any;
}

export const useAgentEvents = (agentId: number | undefined) => {
    const { targetNetwork } = useTargetNetwork();
    const publicClient = usePublicClient({ chainId: targetNetwork.id });
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvents = async () => {
        if (!agentId || !publicClient) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const contentRegistry = contracts?.[targetNetwork.id]?.ContentRegistry;
            const agentStaking = contracts?.[targetNetwork.id]?.AgentStaking;
            const trustScoreRegistry = contracts?.[targetNetwork.id]?.TrustScoreRegistry;

            if (!contentRegistry || !agentStaking || !trustScoreRegistry) {
                console.error("Contracts not found");
                setIsLoading(false);
                return;
            }

            // 1. Fetch ContentPublished events for this agent
            const contentRegistryFromBlock = BigInt(contentRegistry.deployedOnBlock || 0);
            const publishedLogs = await fetchLogsWithChunking(publicClient, {
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
                    agentId: BigInt(agentId),
                },
                fromBlock: contentRegistryFromBlock,
                toBlock: "latest",
            });

            // 2. Fetch Slashed events for this agent
            const agentStakingFromBlock = BigInt(agentStaking.deployedOnBlock || 0);
            const slashedLogs = await fetchLogsWithChunking(publicClient, {
                address: agentStaking.address as `0x${string}`,
                event: {
                    type: "event",
                    name: "Slashed",
                    inputs: [
                        { indexed: true, name: "agentId", type: "uint256" },
                        { indexed: false, name: "amount", type: "uint256" },
                        { indexed: false, name: "reason", type: "string" },
                    ],
                },
                args: {
                    agentId: BigInt(agentId),
                },
                fromBlock: agentStakingFromBlock,
                toBlock: "latest",
            });

            // 3. Fetch Reputation events for this agent
            const trustScoreRegistryFromBlock = BigInt(trustScoreRegistry.deployedOnBlock || 0);
            const repLogs = await fetchLogsWithChunking(publicClient, {
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
                    agentId: BigInt(agentId),
                },
                fromBlock: trustScoreRegistryFromBlock,
                toBlock: "latest",
            });

            // 4. Fetch ContentAudited events (global, filter by hash later)
            // Note: ContentAudited doesn't index agentId, so we fetch all and match by contentHash
            const auditedLogs = await fetchLogsWithChunking(publicClient, {
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
                args: {}, // No args for this one
                fromBlock: contentRegistryFromBlock,
                toBlock: "latest",
            });

            // Process and combine events
            const allEvents: AgentEvent[] = [];
            const contentHashMap = new Map<string, string>(); // hash -> original

            // Helper to get timestamp for a block
            const getBlockTimestamp = async (blockNumber: bigint) => {
                const block = await publicClient.getBlock({ blockNumber });
                return Number(block.timestamp);
            };

            // Process Published
            for (const log of publishedLogs) {
                const timestamp = await getBlockTimestamp(log.blockNumber);
                const contentHash = log.args.contentHash;

                // Compute hash to match with indexed event
                if (contentHash) {
                    const hash = keccak256(stringToBytes(contentHash));
                    contentHashMap.set(hash, contentHash);
                }

                allEvents.push({
                    type: "published",
                    timestamp,
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    data: log.args,
                });
            }

            // Process Slashed
            for (const log of slashedLogs) {
                const timestamp = await getBlockTimestamp(log.blockNumber);
                allEvents.push({
                    type: "slashed",
                    timestamp,
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    data: log.args,
                });
            }

            // Process Reputation
            for (const log of repLogs) {
                const timestamp = await getBlockTimestamp(log.blockNumber);
                allEvents.push({
                    type: "reputation",
                    timestamp,
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    data: log.args,
                });
            }

            // Process Audited (only for our content)
            for (const log of auditedLogs) {
                // The args.contentHash here is the keccak256 hash because it's indexed
                const eventHash = log.args.contentHash;

                if (eventHash && contentHashMap.has(eventHash)) {
                    const originalContentHash = contentHashMap.get(eventHash);
                    const timestamp = await getBlockTimestamp(log.blockNumber);

                    allEvents.push({
                        type: "audited",
                        timestamp,
                        blockNumber: log.blockNumber,
                        transactionHash: log.transactionHash,
                        data: {
                            ...log.args,
                            contentHash: originalContentHash, // Replace hash with original string
                        },
                    });
                }
            }

            // Sort by timestamp desc
            allEvents.sort((a, b) => b.timestamp - a.timestamp);
            setEvents(allEvents);

        } catch (error) {
            console.error("Error fetching agent events:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [agentId, publicClient, targetNetwork.id]);

    return { events, isLoading, refetch: fetchEvents };
};
