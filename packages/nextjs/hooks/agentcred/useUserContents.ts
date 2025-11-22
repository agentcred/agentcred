import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { useTargetNetwork } from "../scaffold-eth";
import { contracts } from "~~/utils/scaffold-eth/contract";

export interface ContentInfo {
    contentHash: string;
    author: string;
    agentId: number;
    status: "Pending" | "Published" | "AuditedOk" | "AuditedFail";
    auditScore: number;
    uri: string;
    timestamp: number;
}

/**
 * Hook to fetch user's contents from ContentRegistry
 */
export const useUserContents = (address: string | undefined) => {
    const { targetNetwork } = useTargetNetwork();
    const publicClient = usePublicClient({ chainId: targetNetwork.id });
    const [contents, setContents] = useState<ContentInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchContents = async () => {
            if (!address || !publicClient) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);

                const contentRegistry = contracts[targetNetwork.id]?.ContentRegistry;
                if (!contentRegistry) {
                    console.error("ContentRegistry not found");
                    setIsLoading(false);
                    return;
                }

                // Fetch ContentPublished events for this author
                const publishedEvents = await publicClient.getLogs({
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
                        author: address as `0x${string}`,
                    },
                    fromBlock: 0n,
                    toBlock: "latest",
                });

                // Fetch content details for each hash
                const contentsList: ContentInfo[] = [];

                console.log("Found", publishedEvents.length, "events");

                for (const event of publishedEvents) {
                    console.log("Event args:", event.args);
                    const contentHash = event.args.contentHash as string;
                    console.log("Querying content with hash:", contentHash);

                    const contentData = await publicClient.readContract({
                        address: contentRegistry.address as `0x${string}`,
                        abi: contentRegistry.abi,
                        functionName: "contents",
                        args: [contentHash],
                    }) as any;

                    console.log("Content data for", contentHash, ":", contentData);

                    // Handle both tuple/array and object formats
                    const agentId = contentData.agentId ?? contentData[2];
                    const status = contentData.status ?? contentData[3];
                    const auditScore = contentData.auditScore ?? contentData[4];
                    const timestamp = contentData.timestamp ?? contentData[6];

                    contentsList.push({
                        contentHash,
                        author: contentData.author ?? contentData[1],
                        agentId: Number(agentId),
                        status: ["Pending", "Published", "AuditedOk", "AuditedFail"][Number(status)] as any,
                        auditScore: Number(auditScore),
                        uri: contentData.uri ?? contentData[5],
                        timestamp: Number(timestamp),
                    });
                }

                // Sort by timestamp descending (newest first)
                contentsList.sort((a, b) => b.timestamp - a.timestamp);
                setContents(contentsList);
            } catch (error) {
                console.error("Error fetching user contents:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContents();
    }, [address, publicClient, targetNetwork.id]);

    return { contents, isLoading };
};
