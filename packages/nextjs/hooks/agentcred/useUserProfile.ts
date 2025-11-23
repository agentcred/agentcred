import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { useTargetNetwork } from "../scaffold-eth";
import { contracts } from "~~/utils/scaffold-eth/contract";
import { fetchLogsWithChunking } from "~~/utils/fetchLogsWithChunking";

export interface UserProfile {
    address: string;
    reputation: number;
    agents: AgentInfo[];
}

export interface AgentInfo {
    agentId: number;
    reputation: number;
    stake: bigint;
    owner: string;
    name?: string;
    image?: string;
}

/**
 * Hook to fetch user profile data including reputation and agents
 */
export const useUserProfile = (address: string | undefined) => {
    const { targetNetwork } = useTargetNetwork();
    const publicClient = usePublicClient({ chainId: targetNetwork.id });
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!address || !publicClient) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);

                const trustScoreRegistry = contracts?.[targetNetwork.id]?.TrustScoreRegistry;
                const agentStaking = contracts?.[targetNetwork.id]?.AgentStaking;

                if (!trustScoreRegistry || !agentStaking) {
                    console.error("Contracts not found");
                    setIsLoading(false);
                    return;
                }

                // Get user reputation
                const userRep = await publicClient.readContract({
                    address: trustScoreRegistry.address as `0x${string}`,
                    abi: trustScoreRegistry.abi,
                    functionName: "userReputation",
                    args: [address],
                }) as bigint;

                // Dynamic agent discovery via Transfer events
                const identityRegistry = contracts?.[targetNetwork.id]?.IdentityRegistry;
                const agents: AgentInfo[] = [];
                const processedAgentIds = new Set<number>();

                if (identityRegistry) {
                    // Find all tokens ever transferred to this user
                    const fromBlock = BigInt(identityRegistry.deployedOnBlock || 0);
                    const transferEvents = await fetchLogsWithChunking(publicClient, {
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
                            to: address as `0x${string}`,
                        },
                        fromBlock,
                        toBlock: "latest",
                    });

                    // Process each potential agent
                    for (const event of transferEvents) {
                        const agentId = Number(event.args.tokenId);

                        if (processedAgentIds.has(agentId)) continue;
                        processedAgentIds.add(agentId);

                        try {
                            // Verify current ownership
                            const owner = await publicClient.readContract({
                                address: identityRegistry.address as `0x${string}`,
                                abi: identityRegistry.abi,
                                functionName: "ownerOf",
                                args: [BigInt(agentId)],
                            }) as string;

                            if (owner.toLowerCase() !== address.toLowerCase()) continue;

                            // Get agent reputation
                            const agentRep = await publicClient.readContract({
                                address: trustScoreRegistry.address as `0x${string}`,
                                abi: trustScoreRegistry.abi,
                                functionName: "agentReputation",
                                args: [BigInt(agentId)],
                            }) as bigint;

                            // Get agent stake
                            const stake = await publicClient.readContract({
                                address: agentStaking.address as `0x${string}`,
                                abi: agentStaking.abi,
                                functionName: "stakes",
                                args: [BigInt(agentId)],
                            }) as bigint;

                            // Get token URI (metadata)
                            let name = `Agent #${agentId}`;
                            let image = "";

                            try {
                                const tokenURI = await publicClient.readContract({
                                    address: identityRegistry.address as `0x${string}`,
                                    abi: identityRegistry.abi,
                                    functionName: "tokenURI",
                                    args: [BigInt(agentId)],
                                }) as string;

                                if (tokenURI.startsWith("data:application/json;base64,")) {
                                    const base64 = tokenURI.split(",")[1];
                                    const json = JSON.parse(atob(base64));
                                    if (json.name) name = json.name;
                                    if (json.image) image = json.image;
                                }
                            } catch (e) {
                                console.error(`Error fetching metadata for agent ${agentId}`, e);
                            }

                            agents.push({
                                agentId,
                                reputation: Number(agentRep),
                                stake,
                                owner,
                                name,
                                image,
                            });
                        } catch (err) {
                            console.error(`Error processing agent ${agentId}`, err);
                        }
                    }
                }

                setProfile({
                    address,
                    reputation: Number(userRep),
                    agents,
                });
            } catch (error) {
                console.error("Error fetching user profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [address, publicClient, targetNetwork.id]);

    return { profile, isLoading, refetch: () => { } };
};
