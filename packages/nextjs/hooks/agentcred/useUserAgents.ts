import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { useTargetNetwork } from "../scaffold-eth";
import { contracts } from "~~/utils/scaffold-eth/contract";
import { fetchLogsWithChunking } from "~~/utils/fetchLogsWithChunking";

export interface AgentInfo {
    agentId: number;
    owner: string;
    tokenURI: string;
}

/**
 * Hook to fetch agents owned by user
 * Listens to Transfer events from IdentityRegistry to find minted NFTs
 */
export const useUserAgents = (address: string | undefined) => {
    const { targetNetwork } = useTargetNetwork();
    const publicClient = usePublicClient({ chainId: targetNetwork.id });
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refetch = async () => {
        if (!address || !publicClient) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const identityRegistry = contracts?.[targetNetwork.id]?.IdentityRegistry;
            if (!identityRegistry) {
                console.error("IdentityRegistry not found");
                setIsLoading(false);
                return;
            }

            // Get Transfer events where 'to' is the user's address
            // Transfer (index_topic_1 address from, index_topic_2 address to, index_topic_3 uint256 tokenId)
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

            const agentsList: AgentInfo[] = [];

            for (const event of transferEvents) {
                const tokenId = event.args.tokenId as bigint;

                // Verify current ownership (in case agent was transferred)
                const currentOwner = await publicClient.readContract({
                    address: identityRegistry.address as `0x${string}`,
                    abi: identityRegistry.abi,
                    functionName: "ownerOf",
                    args: [tokenId],
                }) as string;

                if (currentOwner.toLowerCase() === address.toLowerCase()) {
                    // Get token URI
                    const tokenURI = await publicClient.readContract({
                        address: identityRegistry.address as `0x${string}`,
                        abi: identityRegistry.abi,
                        functionName: "tokenURI",
                        args: [tokenId],
                    }) as string;

                    agentsList.push({
                        agentId: Number(tokenId),
                        owner: currentOwner,
                        tokenURI,
                    });
                }
            }

            setAgents(agentsList);
        } catch (error) {
            console.error("Error fetching user agents:", error);
            setAgents([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refetch();
    }, [address, publicClient, targetNetwork.id]);

    return { agents, isLoading, refetch };
};
