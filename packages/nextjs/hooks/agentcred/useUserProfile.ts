import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { useTargetNetwork } from "../scaffold-eth";
import { contracts } from "~~/utils/scaffold-eth/contract";

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

                const trustScoreRegistry = contracts[targetNetwork.id]?.TrustScoreRegistry;
                const agentStaking = contracts[targetNetwork.id]?.AgentStaking;

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

                // For PoC, we'll fetch data for agents 1 and 2
                // In production, we'd index Staked events to find user's agents
                const agents: AgentInfo[] = [];

                for (let agentId = 1; agentId <= 2; agentId++) {
                    try {
                        // Get agent owner
                        const owner = await publicClient.readContract({
                            address: agentStaking.address as `0x${string}`,
                            abi: agentStaking.abi,
                            functionName: "agentOwners",
                            args: [BigInt(agentId)],
                        }) as string;

                        // Only include if this user owns the agent
                        if (owner.toLowerCase() === address.toLowerCase()) {
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

                            agents.push({
                                agentId,
                                reputation: Number(agentRep),
                                stake,
                                owner,
                            });
                        }
                    } catch (err) {
                        // Agent doesn't exist or error fetching - skip
                        continue;
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
